/*
# Seed Mock Data — Teams, Environments, Repositories, Services, Applications, Container Images

## Overview
Seeds the database with realistic mock data for the Supply Chain Radar platform. This migration creates:
- 5 owner teams
- 3 deployment environments (dev, staging, production)
- 10 repositories
- 15 services
- 4 applications
- 5 container images

## Data Inserted
1. **owner_teams**: Platform, Payments, Auth, Data, Mobile teams
2. **deployment_environments**: development, staging, production
3. **repositories**: 10 repos across teams and languages
4. **services**: 15 services with varying criticality, internet-facing flags, and data classifications
5. **applications**: 4 business applications grouping services
6. **container_images**: 5 container images

## Notes
1. Uses fixed UUIDs for deterministic cross-references in subsequent seed migrations.
2. All data is synthetic and for demonstration only.
*/

-- Owner Teams
INSERT INTO owner_teams (id, name, slug, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Platform Team', 'platform', 'Owns core platform infrastructure and shared libraries'),
  ('a1000000-0000-0000-0000-000000000002', 'Payments Team', 'payments', 'Owns payment processing and billing services'),
  ('a1000000-0000-0000-0000-000000000003', 'Auth Team', 'auth', 'Owns authentication and authorization services'),
  ('a1000000-0000-0000-0000-000000000004', 'Data Team', 'data', 'Owns data pipeline and analytics services'),
  ('a1000000-0000-0000-0000-000000000005', 'Mobile Team', 'mobile', 'Owns mobile backend and API services')
ON CONFLICT (slug) DO NOTHING;

-- Deployment Environments
INSERT INTO deployment_environments (id, name, slug, is_production, is_internet_facing) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'Development', 'development', false, false),
  ('b2000000-0000-0000-0000-000000000002', 'Staging', 'staging', false, true),
  ('b2000000-0000-0000-0000-000000000003', 'Production', 'production', true, true)
ON CONFLICT (slug) DO NOTHING;

-- Repositories (10)
INSERT INTO repositories (id, name, full_name, url, team_id, language, sbom_coverage) VALUES
  ('c3000000-0000-0000-0000-000000000001', 'api-gateway', 'org/api-gateway', 'https://github.com/org/api-gateway', 'a1000000-0000-0000-0000-000000000001', 'TypeScript', true),
  ('c3000000-0000-0000-0000-000000000002', 'payment-service', 'org/payment-service', 'https://github.com/org/payment-service', 'a1000000-0000-0000-0000-000000000002', 'Python', true),
  ('c3000000-0000-0000-0000-000000000003', 'auth-service', 'org/auth-service', 'https://github.com/org/auth-service', 'a1000000-0000-0000-0000-000000000003', 'TypeScript', true),
  ('c3000000-0000-0000-0000-000000000004', 'user-service', 'org/user-service', 'https://github.com/org/user-service', 'a1000000-0000-0000-0000-000000000003', 'TypeScript', false),
  ('c3000000-0000-0000-0000-000000000005', 'data-pipeline', 'org/data-pipeline', 'https://github.com/org/data-pipeline', 'a1000000-0000-0000-0000-000000000004', 'Python', true),
  ('c3000000-0000-0000-0000-000000000006', 'analytics-service', 'org/analytics-service', 'https://github.com/org/analytics-service', 'a1000000-0000-0000-0000-000000000004', 'Python', false),
  ('c3000000-0000-0000-0000-000000000007', 'mobile-api', 'org/mobile-api', 'https://github.com/org/mobile-api', 'a1000000-0000-0000-0000-000000000005', 'TypeScript', true),
  ('c3000000-0000-0000-0000-000000000008', 'notification-service', 'org/notification-service', 'https://github.com/org/notification-service', 'a1000000-0000-0000-0000-000000000001', 'TypeScript', true),
  ('c3000000-0000-0000-0000-000000000009', 'billing-service', 'org/billing-service', 'https://github.com/org/billing-service', 'a1000000-0000-0000-0000-000000000002', 'Python', false),
  ('c3000000-0000-0000-0000-000000000010', 'shared-lib', 'org/shared-lib', 'https://github.com/org/shared-lib', 'a1000000-0000-0000-0000-000000000001', 'TypeScript', true)
ON CONFLICT (full_name) DO NOTHING;

-- Services (15)
INSERT INTO services (id, name, slug, description, repository_id, team_id, criticality, internet_facing, data_classification) VALUES
  ('d4000000-0000-0000-0000-000000000001', 'API Gateway', 'api-gateway', 'Main entry point for all API traffic', 'c3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'critical', true, 'confidential'),
  ('d4000000-0000-0000-0000-000000000002', 'Payment Processor', 'payment-processor', 'Processes credit card and bank transfers', 'c3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'critical', true, 'restricted'),
  ('d4000000-0000-0000-0000-000000000003', 'Payment Validator', 'payment-validator', 'Validates payment requests and fraud detection', 'c3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'high', false, 'restricted'),
  ('d4000000-0000-0000-0000-000000000004', 'Auth Service', 'auth-service', 'OAuth2 and JWT token issuance', 'c3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'critical', true, 'confidential'),
  ('d4000000-0000-0000-0000-000000000005', 'User Profile Service', 'user-profile', 'Manages user profiles and preferences', 'c3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'high', false, 'confidential'),
  ('d4000000-0000-0000-0000-000000000006', 'Session Store', 'session-store', 'Redis-backed session management', 'c3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'high', false, 'confidential'),
  ('d4000000-0000-0000-0000-000000000007', 'Data Ingestion', 'data-ingestion', 'Ingests events from Kafka and SQS', 'c3000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000004', 'high', false, 'internal'),
  ('d4000000-0000-0000-0000-000000000008', 'Analytics Engine', 'analytics-engine', 'Real-time analytics and aggregation', 'c3000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000004', 'medium', false, 'internal'),
  ('d4000000-0000-0000-0000-000000000009', 'Reporting Service', 'reporting-service', 'Generates business reports and dashboards', 'c3000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000004', 'medium', false, 'confidential'),
  ('d4000000-0000-0000-0000-000000000010', 'Mobile API', 'mobile-api', 'Backend API for mobile applications', 'c3000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000005', 'critical', true, 'confidential'),
  ('d4000000-0000-0000-0000-000000000011', 'Notification Service', 'notification-service', 'Email and SMS notification delivery', 'c3000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'medium', true, 'internal'),
  ('d4000000-0000-0000-0000-000000000012', 'Billing Service', 'billing-service', 'Invoice generation and subscription management', 'c3000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000002', 'critical', true, 'restricted'),
  ('d4000000-0000-0000-0000-000000000013', 'Webhook Dispatcher', 'webhook-dispatcher', 'Sends webhooks to third-party integrations', 'c3000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'medium', true, 'internal'),
  ('d4000000-0000-0000-0000-000000000014', 'Feature Flag Service', 'feature-flag-service', 'Manages feature flags and A/B testing config', 'c3000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'low', false, 'internal'),
  ('d4000000-0000-0000-0000-000000000015', 'Audit Log Service', 'audit-log-service', 'Centralized audit logging and compliance', 'c3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'high', false, 'restricted')
ON CONFLICT (slug) DO NOTHING;

-- Applications (4)
INSERT INTO applications (id, name, description, team_id) VALUES
  ('e5000000-0000-0000-0000-000000000001', 'Payment Platform', 'End-to-end payment processing including validation, billing, and webhooks', 'a1000000-0000-0000-0000-000000000002'),
  ('e5000000-0000-0000-0000-000000000002', 'Identity Platform', 'Authentication, user management, and session management', 'a1000000-0000-0000-0000-000000000003'),
  ('e5000000-0000-0000-0000-000000000003', 'Data Platform', 'Data ingestion, analytics, and reporting', 'a1000000-0000-0000-0000-000000000004'),
  ('e5000000-0000-0000-0000-000000000004', 'Mobile Platform', 'Mobile API and push notification delivery', 'a1000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- Container Images (5)
INSERT INTO container_images (id, name, registry, tag, team_id) VALUES
  ('f6000000-0000-0000-0000-000000000001', 'org/api-gateway', 'internal', 'v2.4.1', 'a1000000-0000-0000-0000-000000000001'),
  ('f6000000-0000-0000-0000-000000000002', 'org/payment-processor', 'internal', 'v1.8.0', 'a1000000-0000-0000-0000-000000000002'),
  ('f6000000-0000-0000-0000-000000000003', 'org/auth-service', 'internal', 'v3.2.0', 'a1000000-0000-0000-0000-000000000003'),
  ('f6000000-0000-0000-0000-000000000004', 'org/data-ingestion', 'internal', 'v1.5.3', 'a1000000-0000-0000-0000-000000000004'),
  ('f6000000-0000-0000-0000-000000000005', 'org/mobile-api', 'internal', 'v2.1.0', 'a1000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;
