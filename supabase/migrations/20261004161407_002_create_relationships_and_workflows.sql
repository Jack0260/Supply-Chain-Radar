/*
# Create Relationship, Vulnerability, and Workflow Tables

## Overview
This migration creates the tables that model relationships between entities (dependency edges, SBOMs, exposures), security findings (vulnerabilities, CVEs, risk assessments), and the security workflow (remediation tickets, exceptions, audit logs).

## New Tables

### dependency_edges
- `id` (uuid, PK): Unique edge identifier
- `source_type` (text): Type of source node (service, repository, package, container_image, environment)
- `source_id` (uuid): ID of source entity
- `target_type` (text): Type of target node
- `target_id` (uuid): ID of target entity
- `edge_type` (text): Relationship type (depends_on, deploys_to, owns, exposes, imports, contains)
- `is_direct` (boolean, default true): Whether this is a direct (vs transitive) dependency
- `created_at` (timestamptz): Record creation time

### sboms
- `id` (uuid, PK): Unique SBOM identifier
- `repository_id` (uuid, FK → repositories): Associated repository
- `service_id` (uuid, FK → services): Associated service
- `format` (text): SBOM format (CycloneDX, SPDX, package-lock, requirements, pyproject, container-manifest)
- `content` (jsonb): Raw parsed SBOM content
- `uploaded_at` (timestamptz): Upload time

### vulnerabilities
- `id` (uuid, PK): Unique vulnerability identifier
- `cve_id` (text, unique): CVE identifier (e.g. "CVE-2024-1234")
- `title` (text): Short description
- `description` (text): Detailed description
- `severity` (text): Severity level (critical, high, medium, low)
- `cvss_score` (numeric): CVSS base score (0-10)
- `exploit_available` (boolean, default false): Whether a public exploit is simulated as available
- `published_at` (timestamptz): When the vulnerability was published
- `discovered_at` (timestamptz): When it was detected in our environment
- `package_id` (uuid, FK → packages): Affected package
- `affected_versions` (text): Version range affected
- `fix_available` (boolean, default false): Whether a fix exists
- `fixed_in_version` (text): Version that fixes the issue
- `created_at` (timestamptz): Record creation time

### exposures
- `id` (uuid, PK): Unique exposure identifier
- `vulnerability_id` (uuid, FK → vulnerabilities): Associated vulnerability
- `service_id` (uuid, FK → services): Affected service
- `environment_id` (uuid, FK → deployment_environments): Environment where exposed
- `package_version_id` (uuid, FK → package_versions): Specific version involved
- `exposure_type` (text): How the vulnerability is exposed (direct_dependency, transitive_dependency, container_layer)
- `status` (text, default 'open'): Status (open, remediated, exception)
- `detected_at` (timestamptz): When the exposure was detected
- `created_at` (timestamptz): Record creation time

### risk_assessments
- `id` (uuid, PK): Unique assessment identifier
- `exposure_id` (uuid, FK → exposures): Associated exposure
- `risk_score` (numeric): Composite risk score (0-100)
- `risk_level` (text): Priority level (critical, high, medium, low)
- `factors` (jsonb): Breakdown of scoring factors
- `blast_radius` (integer): Number of downstream dependents affected
- `production_impact` (boolean): Whether production is affected
- `internet_exposure` (boolean): Whether internet-facing
- `calculated_at` (timestamptz): When the assessment was calculated
- `created_at` (timestamptz): Record creation time

### remediation_tickets
- `id` (uuid, PK): Unique ticket identifier
- `exposure_id` (uuid, FK → exposures): Associated exposure
- `assigned_team_id` (uuid, FK → owner_teams): Team assigned to fix
- `status` (text, default 'open'): Ticket status (open, in_progress, resolved, verified)
- `priority` (text): Priority (critical, high, medium, low)
- `due_date` (timestamptz): Remediation due date
- `resolved_at` (timestamptz): When resolved
- `notes` (text): Free-form notes
- `created_at` (timestamptz): Record creation time

### exceptions
- `id` (uuid, PK): Unique exception identifier
- `exposure_id` (uuid, FK → exposures): Associated exposure
- `reason` (text): Why the exception was granted
- `compensating_control` (text): What mitigation is in place
- `expires_at` (timestamptz): When the exception expires
- `approved_by` (text): Who approved the exception
- `status` (text, default 'active'): Status (active, expired, revoked)
- `created_at` (timestamptz): Record creation time

### audit_logs
- `id` (uuid, PK): Unique log entry identifier
- `entity_type` (text): Type of entity acted on (exposure, ticket, exception, etc.)
- `entity_id` (uuid): ID of the entity
- `action` (text): What action was taken (triaged, assigned, ticket_created, exception_filed, remediated, verified)
- `actor` (text): Who performed the action
- `details` (jsonb): Before/after values and context
- `created_at` (timestamptz): When the action occurred

## Security
- RLS enabled on all tables with open anon+authenticated CRUD policies (single-tenant, no auth).

## Notes
1. dependency_edges uses polymorphic references (source_type/source_id, target_type/target_id) to connect any entity type.
2. risk_assessments.factors stores the scoring breakdown as JSON for flexible display.
3. audit_logs.details stores before/after state as JSON for full traceability.
*/

-- Dependency Edges (polymorphic graph)
CREATE TABLE IF NOT EXISTS dependency_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('service', 'repository', 'package', 'package_version', 'container_image', 'environment', 'application')),
  source_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('service', 'repository', 'package', 'package_version', 'container_image', 'environment', 'application')),
  target_id uuid NOT NULL,
  edge_type text NOT NULL CHECK (edge_type IN ('depends_on', 'deploys_to', 'owns', 'exposes', 'imports', 'contains', 'uses')),
  is_direct boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dependency_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_dependency_edges" ON dependency_edges;
CREATE POLICY "anon_select_dependency_edges" ON dependency_edges FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dependency_edges" ON dependency_edges;
CREATE POLICY "anon_insert_dependency_edges" ON dependency_edges FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dependency_edges" ON dependency_edges;
CREATE POLICY "anon_update_dependency_edges" ON dependency_edges FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dependency_edges" ON dependency_edges;
CREATE POLICY "anon_delete_dependency_edges" ON dependency_edges FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_edges_source ON dependency_edges(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON dependency_edges(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON dependency_edges(edge_type);

-- SBOMs
CREATE TABLE IF NOT EXISTS sboms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  format text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE sboms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sboms" ON sboms;
CREATE POLICY "anon_select_sboms" ON sboms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sboms" ON sboms;
CREATE POLICY "anon_insert_sboms" ON sboms FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sboms" ON sboms;
CREATE POLICY "anon_update_sboms" ON sboms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sboms" ON sboms;
CREATE POLICY "anon_delete_sboms" ON sboms FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_sboms_repository_id ON sboms(repository_id);
CREATE INDEX IF NOT EXISTS idx_sboms_service_id ON sboms(service_id);

-- Vulnerabilities
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cve_id text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  cvss_score numeric DEFAULT 0,
  exploit_available boolean DEFAULT false,
  published_at timestamptz,
  discovered_at timestamptz DEFAULT now(),
  package_id uuid REFERENCES packages(id) ON DELETE CASCADE,
  affected_versions text,
  fix_available boolean DEFAULT false,
  fixed_in_version text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_select_vulnerabilities" ON vulnerabilities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_insert_vulnerabilities" ON vulnerabilities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_update_vulnerabilities" ON vulnerabilities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_delete_vulnerabilities" ON vulnerabilities FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_package_id ON vulnerabilities(package_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cve_id ON vulnerabilities(cve_id);

-- Exposures
CREATE TABLE IF NOT EXISTS exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_id uuid NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  environment_id uuid REFERENCES deployment_environments(id) ON DELETE SET NULL,
  package_version_id uuid REFERENCES package_versions(id) ON DELETE SET NULL,
  exposure_type text DEFAULT 'direct_dependency' CHECK (exposure_type IN ('direct_dependency', 'transitive_dependency', 'container_layer')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'remediated', 'exception')),
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exposures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_exposures" ON exposures;
CREATE POLICY "anon_select_exposures" ON exposures FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_exposures" ON exposures;
CREATE POLICY "anon_insert_exposures" ON exposures FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_exposures" ON exposures;
CREATE POLICY "anon_update_exposures" ON exposures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_exposures" ON exposures;
CREATE POLICY "anon_delete_exposures" ON exposures FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_exposures_vulnerability_id ON exposures(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_exposures_service_id ON exposures(service_id);
CREATE INDEX IF NOT EXISTS idx_exposures_status ON exposures(status);
CREATE INDEX IF NOT EXISTS idx_exposures_environment_id ON exposures(environment_id);

-- Risk Assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id uuid NOT NULL REFERENCES exposures(id) ON DELETE CASCADE,
  risk_score numeric DEFAULT 0,
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  factors jsonb DEFAULT '{}',
  blast_radius integer DEFAULT 0,
  production_impact boolean DEFAULT false,
  internet_exposure boolean DEFAULT false,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_risk_assessments" ON risk_assessments;
CREATE POLICY "anon_select_risk_assessments" ON risk_assessments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_risk_assessments" ON risk_assessments;
CREATE POLICY "anon_insert_risk_assessments" ON risk_assessments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_risk_assessments" ON risk_assessments;
CREATE POLICY "anon_update_risk_assessments" ON risk_assessments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_risk_assessments" ON risk_assessments;
CREATE POLICY "anon_delete_risk_assessments" ON risk_assessments FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_exposure_id ON risk_assessments(exposure_id);

-- Remediation Tickets
CREATE TABLE IF NOT EXISTS remediation_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id uuid NOT NULL REFERENCES exposures(id) ON DELETE CASCADE,
  assigned_team_id uuid REFERENCES owner_teams(id) ON DELETE SET NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'verified')),
  priority text DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  due_date timestamptz,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE remediation_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_remediation_tickets" ON remediation_tickets;
CREATE POLICY "anon_select_remediation_tickets" ON remediation_tickets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_remediation_tickets" ON remediation_tickets;
CREATE POLICY "anon_insert_remediation_tickets" ON remediation_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_remediation_tickets" ON remediation_tickets;
CREATE POLICY "anon_update_remediation_tickets" ON remediation_tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_remediation_tickets" ON remediation_tickets;
CREATE POLICY "anon_delete_remediation_tickets" ON remediation_tickets FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_remediation_tickets_exposure_id ON remediation_tickets(exposure_id);
CREATE INDEX IF NOT EXISTS idx_remediation_tickets_status ON remediation_tickets(status);
CREATE INDEX IF NOT EXISTS idx_remediation_tickets_team_id ON remediation_tickets(assigned_team_id);

-- Exceptions
CREATE TABLE IF NOT EXISTS exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id uuid NOT NULL REFERENCES exposures(id) ON DELETE CASCADE,
  reason text NOT NULL,
  compensating_control text,
  expires_at timestamptz NOT NULL,
  approved_by text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_exceptions" ON exceptions;
CREATE POLICY "anon_select_exceptions" ON exceptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_exceptions" ON exceptions;
CREATE POLICY "anon_insert_exceptions" ON exceptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_exceptions" ON exceptions;
CREATE POLICY "anon_update_exceptions" ON exceptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_exceptions" ON exceptions;
CREATE POLICY "anon_delete_exceptions" ON exceptions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_exceptions_exposure_id ON exceptions(exposure_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor text DEFAULT 'system',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_audit_logs" ON audit_logs;
CREATE POLICY "anon_update_audit_logs" ON audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_audit_logs" ON audit_logs;
CREATE POLICY "anon_delete_audit_logs" ON audit_logs FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
