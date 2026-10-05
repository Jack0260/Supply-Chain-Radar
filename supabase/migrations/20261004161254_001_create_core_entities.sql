/*
# Create Core Entity Tables

## Overview
This migration creates the foundational entity tables for the Supply Chain Radar platform — a software supply-chain security and dependency risk intelligence tool. These tables model the real-world components of a software supply chain: teams, repositories, services, applications, packages, package versions, container images, and deployment environments.

## New Tables

### owner_teams
- `id` (uuid, PK): Unique team identifier
- `name` (text, not null): Team display name (e.g. "Platform Team")
- `slug` (text, unique, not null): URL-safe identifier
- `description` (text): What the team owns
- `created_at` (timestamptz): Record creation time

### repositories
- `id` (uuid, PK): Unique repository identifier
- `name` (text, not null): Repository name
- `full_name` (text, unique, not null): Full path (e.g. "org/payment-service")
- `url` (text): Repository URL
- `team_id` (uuid, FK → owner_teams): Owning team
- `language` (text): Primary language (e.g. "TypeScript", "Python")
- `sbom_coverage` (boolean, default false): Whether an SBOM has been uploaded
- `created_at` (timestamptz): Record creation time

### services
- `id` (uuid, PK): Unique service identifier
- `name` (text, not null): Service display name
- `slug` (text, unique, not null): URL-safe identifier
- `description` (text): What the service does
- `repository_id` (uuid, FK → repositories): Source repository
- `team_id` (uuid, FK → owner_teams): Owning team
- `criticality` (text, default 'medium'): Business criticality (critical, high, medium, low)
- `internet_facing` (boolean, default false): Whether the service is exposed to the internet
- `data_classification` (text, default 'internal'): Data sensitivity (public, internal, confidential, restricted)
- `created_at` (timestamptz): Record creation time

### applications
- `id` (uuid, PK): Unique application identifier
- `name` (text, not null): Application display name
- `description` (text): What the application is
- `team_id` (uuid, FK → owner_teams): Owning team
- `created_at` (timestamptz): Record creation time

### packages
- `id` (uuid, PK): Unique package identifier
- `name` (text, not null): Package name (e.g. "lodash", "requests")
- `ecosystem` (text, not null): Package ecosystem (npm, pypi, go, etc.)
- `description` (text): Package description
- `license` (text): License type (e.g. "MIT", "Apache-2.0", "GPL-3.0")
- `latest_version` (text): Latest known version
- `created_at` (timestamptz): Record creation time

### package_versions
- `id` (uuid, PK): Unique package version identifier
- `package_id` (uuid, FK → packages): Parent package
- `version` (text, not null): Version string (e.g. "4.17.21")
- `released_at` (timestamptz): When this version was published
- `is_current` (boolean, default false): Whether this is the latest version
- `fix_available` (boolean, default false): Whether a fix is available
- `fixed_in_version` (text): Version that fixes the vulnerability, if any
- `created_at` (timestamptz): Record creation time

### container_images
- `id` (uuid, PK): Unique container image identifier
- `name` (text, not null): Image name (e.g. "org/payment-service:latest")
- `registry` (text, default 'internal'): Container registry
- `tag` (text): Image tag
- `team_id` (uuid, FK → owner_teams): Owning team
- `created_at` (timestamptz): Record creation time

### deployment_environments
- `id` (uuid, PK): Unique environment identifier
- `name` (text, not null): Environment name (e.g. "production", "staging", "development")
- `slug` (text, unique, not null): URL-safe identifier
- `is_production` (boolean, default false): Whether this is a production environment
- `is_internet_facing` (boolean, default false): Whether the environment is internet-facing
- `created_at` (timestamptz): Record creation time

## Security
- RLS enabled on all tables.
- Open anon+authenticated CRUD policies since this is a single-tenant internal tool with no sign-in screen.

## Notes
1. All tables use gen_random_uuid() for primary keys.
2. Foreign keys use ON DELETE CASCADE for cleanup.
3. Indexes added for frequently queried columns.
*/

-- Owner Teams
CREATE TABLE IF NOT EXISTS owner_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE owner_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_owner_teams" ON owner_teams;
CREATE POLICY "anon_select_owner_teams" ON owner_teams FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_owner_teams" ON owner_teams;
CREATE POLICY "anon_insert_owner_teams" ON owner_teams FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_owner_teams" ON owner_teams;
CREATE POLICY "anon_update_owner_teams" ON owner_teams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_owner_teams" ON owner_teams;
CREATE POLICY "anon_delete_owner_teams" ON owner_teams FOR DELETE TO anon, authenticated USING (true);

-- Repositories
CREATE TABLE IF NOT EXISTS repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  full_name text UNIQUE NOT NULL,
  url text,
  team_id uuid REFERENCES owner_teams(id) ON DELETE SET NULL,
  language text,
  sbom_coverage boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_repositories" ON repositories;
CREATE POLICY "anon_select_repositories" ON repositories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_repositories" ON repositories;
CREATE POLICY "anon_insert_repositories" ON repositories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_repositories" ON repositories;
CREATE POLICY "anon_update_repositories" ON repositories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_repositories" ON repositories;
CREATE POLICY "anon_delete_repositories" ON repositories FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_repositories_team_id ON repositories(team_id);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  repository_id uuid REFERENCES repositories(id) ON DELETE SET NULL,
  team_id uuid REFERENCES owner_teams(id) ON DELETE SET NULL,
  criticality text DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  internet_facing boolean DEFAULT false,
  data_classification text DEFAULT 'internal' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_services" ON services;
CREATE POLICY "anon_select_services" ON services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "anon_insert_services" ON services FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "anon_update_services" ON services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "anon_delete_services" ON services FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_services_team_id ON services(team_id);
CREATE INDEX IF NOT EXISTS idx_services_repository_id ON services(repository_id);
CREATE INDEX IF NOT EXISTS idx_services_criticality ON services(criticality);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  team_id uuid REFERENCES owner_teams(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_applications" ON applications;
CREATE POLICY "anon_select_applications" ON applications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_applications" ON applications;
CREATE POLICY "anon_insert_applications" ON applications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_applications" ON applications;
CREATE POLICY "anon_update_applications" ON applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_applications" ON applications;
CREATE POLICY "anon_delete_applications" ON applications FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_applications_team_id ON applications(team_id);

-- Packages
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ecosystem text NOT NULL,
  description text,
  license text,
  latest_version text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_packages" ON packages;
CREATE POLICY "anon_select_packages" ON packages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_packages" ON packages;
CREATE POLICY "anon_insert_packages" ON packages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_packages" ON packages;
CREATE POLICY "anon_update_packages" ON packages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_packages" ON packages;
CREATE POLICY "anon_delete_packages" ON packages FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_packages_name_ecosystem ON packages(name, ecosystem);
CREATE INDEX IF NOT EXISTS idx_packages_ecosystem ON packages(ecosystem);

-- Package Versions
CREATE TABLE IF NOT EXISTS package_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  version text NOT NULL,
  released_at timestamptz,
  is_current boolean DEFAULT false,
  fix_available boolean DEFAULT false,
  fixed_in_version text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE package_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_package_versions" ON package_versions;
CREATE POLICY "anon_select_package_versions" ON package_versions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_package_versions" ON package_versions;
CREATE POLICY "anon_insert_package_versions" ON package_versions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_package_versions" ON package_versions;
CREATE POLICY "anon_update_package_versions" ON package_versions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_package_versions" ON package_versions;
CREATE POLICY "anon_delete_package_versions" ON package_versions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_package_versions_package_id ON package_versions(package_id);

-- Container Images
CREATE TABLE IF NOT EXISTS container_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registry text DEFAULT 'internal',
  tag text,
  team_id uuid REFERENCES owner_teams(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE container_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_container_images" ON container_images;
CREATE POLICY "anon_select_container_images" ON container_images FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_container_images" ON container_images;
CREATE POLICY "anon_insert_container_images" ON container_images FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_container_images" ON container_images;
CREATE POLICY "anon_update_container_images" ON container_images FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_container_images" ON container_images;
CREATE POLICY "anon_delete_container_images" ON container_images FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_container_images_team_id ON container_images(team_id);

-- Deployment Environments
CREATE TABLE IF NOT EXISTS deployment_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  is_production boolean DEFAULT false,
  is_internet_facing boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE deployment_environments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_deployment_environments" ON deployment_environments;
CREATE POLICY "anon_select_deployment_environments" ON deployment_environments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_deployment_environments" ON deployment_environments;
CREATE POLICY "anon_insert_deployment_environments" ON deployment_environments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_deployment_environments" ON deployment_environments;
CREATE POLICY "anon_update_deployment_environments" ON deployment_environments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_deployment_environments" ON deployment_environments;
CREATE POLICY "anon_delete_deployment_environments" ON deployment_environments FOR DELETE TO anon, authenticated USING (true);
