# Supply Chain Radar

A software supply-chain security and dependency risk intelligence platform. Track vulnerabilities across your services, visualize blast radius, score risk, and manage remediation workflows.

## Features

- **Dashboard** — Total vulnerabilities, critical-in-production count, mean time to remediate, SBOM coverage, risk by team/environment, top packages by blast radius, vulnerability age distribution, fixable vs not-fixable, license risk summary
- **Dependency Graph** — Interactive React Flow visualization of services, packages, containers, and environments. Click a vulnerable package to trace its blast radius with highlighted paths
- **Findings** — Filterable list of vulnerability exposures sorted by risk score, with search by CVE/title/service
- **Finding Detail & Blast Radius Brief** — Per-finding page with vulnerable component, affected applications, production services at risk, business criticality, exposure path, suggested remediation order, owners to notify, temporary mitigations, and estimated risk reduction
- **Risk Scoring Engine** — Composite score (0-100) combining severity, production impact, internet exposure, exploit availability, fix availability, asset criticality, data classification, age, blast radius, and compensating controls
- **SBOM Ingestion** — Upload package-lock.json, requirements.txt, pyproject.toml, CycloneDX/SPDX, or container manifests to update the dependency graph
- **Security Workflow** — Triage findings, assign owners, create remediation tickets, file exceptions with expiry dates and compensating controls, verify remediation via new SBOM upload
- **Audit Log** — Full chronological history of all actions
- **Dark/Light Theme** — Toggle between dark and light modes

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Graph Visualization**: React Flow
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL + RLS)
- **Testing**: Vitest

## Getting Started

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run test     # Run unit tests
npm run typecheck # Type checking
```

## Database

All data is stored in Supabase (PostgreSQL). The schema includes 16 tables with row-level security enabled. Migrations are applied via the Supabase MCP tool. See `supabase/migrations/` for the full schema.

### Seed Data

The platform comes pre-seeded with:
- 5 owner teams
- 10 repositories
- 15 services (with varying criticality, internet-facing flags, data classifications)
- 101 packages (npm, pypi, go)
- 202 package versions
- 20 vulnerabilities (CVEs with varying severity)
- 5 container images
- 3 deployment environments (dev, staging, production)
- 237 dependency edges
- 41 exposures with computed risk assessments

The package `lodash` (CVE-2024-45801, CVSS 9.8, exploit available) is the critical package with the largest downstream blast radius, affecting 5 services.

## Risk Scoring

The risk score (0-100) is computed from:

| Factor | Max Points |
|--------|-----------|
| CVSS Severity | 40 |
| Production Impact | 10 |
| Internet Facing | 10 |
| Exploit Available | 15 |
| No Fix Available | 10 |
| Asset Criticality | 15 |
| Data Classification | 12 |
| Age (days since detection) | 10 |
| Blast Radius | 10 |
| Compensating Control | -15 |

Score levels: Critical (80+), High (60-79), Medium (30-59), Low (<30)

## Testing

Unit tests cover:
- **Graph traversal** — blast radius calculation, direct vs transitive dependents, adjacency list construction
- **Risk scoring** — score computation, compensating control reduction, clamping, level assignment
- **Vulnerability deduplication** — duplicate CVE removal
- **Exception expiry** — expired vs active detection
- **SBOM parsing** — requirements.txt, pyproject.toml, package-lock.json, format detection
- **Integration** — remediated dependency risk reduction validation

```bash
npm test
```

## Threat Model

### Assets
- Dependency graph data (services, packages, vulnerabilities, edges)
- Risk assessments and scoring
- Remediation tickets and exceptions
- Audit logs
- SBOM data

### Threats
1. **Data tampering** — An attacker modifies vulnerability data to hide exposures. Mitigated by RLS policies and audit logging.
2. **SBOM injection** — A malicious SBOM upload injects fake packages. Mitigated by parser validation and audit logging of all uploads.
3. **Exception abuse** — Excessive exceptions mask real vulnerabilities. Mitigated by expiry dates and compensating control requirements.
4. **Information disclosure** — Vulnerability details exposed to unauthorized users. Mitigated by RLS (currently single-tenant open access; add auth for multi-tenant).

### Security Notes
- All database tables have RLS enabled
- No `user_id` columns or auth — currently single-tenant (add auth before deploying multi-tenant)
- Audit logging on all workflow actions
- SBOM parser validates input format before processing
- No user-supplied URLs are fetched from the server
- No `dangerouslySetInnerHTML` or DOM injection sinks
- Environment variables are not exposed beyond the Supabase anon key

### Secure Development Notes
- TypeScript strict mode enabled
- No `any` types in application code
- All API calls check errors before using data
- Input validation on SBOM uploads
- Parameterized Supabase queries (no raw SQL from client)

## Docker

```bash
docker-compose up --build
```

See `docker-compose.yml` and `Dockerfile` for containerized deployment.

## License

MIT
