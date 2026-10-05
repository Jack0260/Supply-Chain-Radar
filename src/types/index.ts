export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Criticality = 'critical' | 'high' | 'medium' | 'low';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type EdgeType = 'depends_on' | 'deploys_to' | 'owns' | 'exposes' | 'imports' | 'contains' | 'uses';
export type NodeType = 'service' | 'repository' | 'package' | 'package_version' | 'container_image' | 'environment' | 'application';
export type ExposureType = 'direct_dependency' | 'transitive_dependency' | 'container_layer';
export type ExposureStatus = 'open' | 'remediated' | 'exception';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'verified';
export type ExceptionStatus = 'active' | 'expired' | 'revoked';

export interface OwnerTeam {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  url: string | null;
  team_id: string | null;
  language: string | null;
  sbom_coverage: boolean;
  created_at: string;
  team?: OwnerTeam;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  repository_id: string | null;
  team_id: string | null;
  criticality: Criticality;
  internet_facing: boolean;
  data_classification: DataClassification;
  created_at: string;
  team?: OwnerTeam;
  repository?: Repository;
}

export interface Package {
  id: string;
  name: string;
  ecosystem: string;
  description: string | null;
  license: string | null;
  latest_version: string | null;
  created_at: string;
}

export interface PackageVersion {
  id: string;
  package_id: string;
  version: string;
  released_at: string | null;
  is_current: boolean;
  fix_available: boolean;
  fixed_in_version: string | null;
  created_at: string;
  package?: Package;
}

export interface ContainerImage {
  id: string;
  name: string;
  registry: string;
  tag: string | null;
  team_id: string | null;
  created_at: string;
  team?: OwnerTeam;
}

export interface DeploymentEnvironment {
  id: string;
  name: string;
  slug: string;
  is_production: boolean;
  is_internet_facing: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  name: string;
  description: string | null;
  team_id: string | null;
  created_at: string;
  team?: OwnerTeam;
}

export interface DependencyEdge {
  id: string;
  source_type: NodeType;
  source_id: string;
  target_type: NodeType;
  target_id: string;
  edge_type: EdgeType;
  is_direct: boolean;
  created_at: string;
}

export interface SBOM {
  id: string;
  repository_id: string | null;
  service_id: string | null;
  format: string;
  content: Record<string, unknown>;
  uploaded_at: string;
}

export interface Vulnerability {
  id: string;
  cve_id: string;
  title: string;
  description: string | null;
  severity: Severity;
  cvss_score: number;
  exploit_available: boolean;
  published_at: string | null;
  discovered_at: string | null;
  package_id: string | null;
  affected_versions: string | null;
  fix_available: boolean;
  fixed_in_version: string | null;
  created_at: string;
  package?: Package;
}

export interface Exposure {
  id: string;
  vulnerability_id: string;
  service_id: string;
  environment_id: string | null;
  package_version_id: string | null;
  exposure_type: ExposureType;
  status: ExposureStatus;
  detected_at: string;
  created_at: string;
  vulnerability?: Vulnerability;
  service?: Service;
  environment?: DeploymentEnvironment;
}

export interface RiskFactors {
  severity: Severity;
  cvss_score: number;
  production: boolean;
  internet_facing: boolean;
  exploit_available: boolean;
  fix_available: boolean;
  criticality: Criticality;
  data_classification: DataClassification;
  days_since_detection: number;
  blast_radius: number;
}

export interface RiskAssessment {
  id: string;
  exposure_id: string;
  risk_score: number;
  risk_level: Severity;
  factors: RiskFactors;
  blast_radius: number;
  production_impact: boolean;
  internet_exposure: boolean;
  calculated_at: string;
  created_at: string;
}

export interface RemediationTicket {
  id: string;
  exposure_id: string;
  assigned_team_id: string | null;
  status: TicketStatus;
  priority: Severity;
  due_date: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  assigned_team?: OwnerTeam;
  exposure?: Exposure;
}

export interface Exception {
  id: string;
  exposure_id: string;
  reason: string;
  compensating_control: string | null;
  expires_at: string;
  approved_by: string | null;
  status: ExceptionStatus;
  created_at: string;
  exposure?: Exposure;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface FindingWithDetails extends Exposure {
  risk_assessment?: RiskAssessment;
  remediation_tickets?: RemediationTicket[];
  exceptions?: Exception[];
}
