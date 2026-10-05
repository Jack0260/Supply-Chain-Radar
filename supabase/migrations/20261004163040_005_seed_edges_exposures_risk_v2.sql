/*
# Seed Dependency Edges, Exposures, and Risk Assessments

## Overview
Creates the dependency graph, exposures, and computed risk assessments.
Fixes the column ordering bug from the previous attempt.
*/

DO $$
DECLARE
    s_rec RECORD;
    p_rec RECORD;
    c_rec RECORD;
    e_rec RECORD;
    v_rec RECORD;
    exp_rec RECORD;
    prod_env_id uuid;
    staging_env_id uuid;
    dev_env_id uuid;
    days_since int;
    blast int;
    score int;
    level text;
    sev_weight jsonb := '{"critical":40,"high":25,"medium":15,"low":5}'::jsonb;
    crit_weight jsonb := '{"critical":15,"high":10,"medium":5,"low":2}'::jsonb;
    data_weight jsonb := '{"restricted":12,"confidential":8,"internal":4,"public":1}'::jsonb;
BEGIN
    SELECT id INTO prod_env_id FROM deployment_environments WHERE slug = 'production';
    SELECT id INTO staging_env_id FROM deployment_environments WHERE slug = 'staging';
    SELECT id INTO dev_env_id FROM deployment_environments WHERE slug = 'development';

    -- Service -> Package edges (depends_on) for each service
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','axios','jsonwebtoken','helmet','cors','pino','ioredis','dotenv','joi','winston','lodash','minimist','uuid','dayjs') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'api-gateway' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('requests','flask','sqlalchemy','celery','redis-py','pyjwt','cryptography','psycopg2','boto3','structlog','passlib') AND ecosystem='pypi' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'payment-processor' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('requests','pydantic','httpx','cryptography','marshmallow','tenacity') AND ecosystem='pypi' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'payment-validator' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','jsonwebtoken','bcrypt','passport','ioredis','dotenv','joi','winston','uuid','lodash') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'auth-service' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','pg','dotenv','joi','winston','dayjs','zod','lodash') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'user-profile' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','ioredis','jsonwebtoken','dotenv','pino','uuid') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'session-store' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('kafka-python','redis-py','pymongo','celery','structlog','boto3','requests') AND ecosystem='pypi' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'data-ingestion' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('numpy','pandas','scipy','scikit-learn','fastapi','uvicorn','redis-py','aiohttp') AND ecosystem='pypi' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'analytics-engine' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('flask','jinja2','pandas','numpy','celery','redis-py') AND ecosystem='pypi' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'reporting-service' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','axios','jsonwebtoken','helmet','cors','pino','dotenv','joi','winston','lodash','moment','body-parser','cookie-parser') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'mobile-api' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','axios','ws','dotenv','pino','winston','handlebars','ioredis') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'notification-service' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('django','sqlalchemy','celery','redis-py','pyjwt','cryptography','psycopg2','boto3','jinja2') AND ecosystem='pypi' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'billing-service' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','axios','ws','dotenv','pino','winston','uuid','dayjs') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'webhook-dispatcher' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','ioredis','dotenv','pino','joi','zod','uuid','dayjs') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'feature-flag-service' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','pg','winston','dotenv','joi','uuid','dayjs','lodash','ajv') AND ecosystem='npm' LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
        SELECT 'service', s.id, 'package', p_rec.id, 'depends_on', true FROM services s WHERE s.slug = 'audit-log-service' ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Service->Package edges: %', (SELECT count(*) FROM dependency_edges WHERE edge_type='depends_on' AND source_type='service');

    -- Container -> Package edges
    FOR c_rec IN SELECT id, name FROM container_images LOOP
        IF c_rec.name = 'org/api-gateway' THEN
            FOR p_rec IN SELECT id FROM packages WHERE name IN ('lodash','express','axios','jsonwebtoken','helmet','cors','pino','ioredis','dotenv','joi','winston','minimist','uuid','dayjs') AND ecosystem='npm' LOOP
                INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('container_image', c_rec.id, 'package', p_rec.id, 'contains', true) ON CONFLICT DO NOTHING;
            END LOOP;
        ELSIF c_rec.name = 'org/payment-processor' THEN
            FOR p_rec IN SELECT id FROM packages WHERE name IN ('requests','flask','sqlalchemy','celery','redis-py','pyjwt','cryptography','psycopg2','boto3','structlog','passlib') AND ecosystem='pypi' LOOP
                INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('container_image', c_rec.id, 'package', p_rec.id, 'contains', true) ON CONFLICT DO NOTHING;
            END LOOP;
        ELSIF c_rec.name = 'org/auth-service' THEN
            FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','jsonwebtoken','bcrypt','passport','ioredis','dotenv','joi','winston','uuid','lodash') AND ecosystem='npm' LOOP
                INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('container_image', c_rec.id, 'package', p_rec.id, 'contains', true) ON CONFLICT DO NOTHING;
            END LOOP;
        ELSIF c_rec.name = 'org/data-ingestion' THEN
            FOR p_rec IN SELECT id FROM packages WHERE name IN ('kafka-python','redis-py','pymongo','celery','structlog','boto3','requests') AND ecosystem='pypi' LOOP
                INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('container_image', c_rec.id, 'package', p_rec.id, 'contains', true) ON CONFLICT DO NOTHING;
            END LOOP;
        ELSIF c_rec.name = 'org/mobile-api' THEN
            FOR p_rec IN SELECT id FROM packages WHERE name IN ('express','axios','jsonwebtoken','helmet','cors','pino','dotenv','joi','winston','lodash','moment','body-parser','cookie-parser') AND ecosystem='npm' LOOP
                INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('container_image', c_rec.id, 'package', p_rec.id, 'contains', true) ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;

    -- Service -> Environment edges
    FOR s_rec IN SELECT id FROM services LOOP
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('service', s_rec.id, 'environment', prod_env_id, 'deploys_to', true) ON CONFLICT DO NOTHING;
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('service', s_rec.id, 'environment', staging_env_id, 'deploys_to', true) ON CONFLICT DO NOTHING;
        INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct) VALUES ('service', s_rec.id, 'environment', dev_env_id, 'deploys_to', true) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Transitive package->package edges (correct column order)
    INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
    SELECT 'package', p1.id, 'package', p2.id, 'depends_on', false
    FROM packages p1, packages p2 WHERE p1.name='express' AND p1.ecosystem='npm' AND p2.name='body-parser' AND p2.ecosystem='npm' ON CONFLICT DO NOTHING;
    INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
    SELECT 'package', p1.id, 'package', p2.id, 'depends_on', false
    FROM packages p1, packages p2 WHERE p1.name='express' AND p1.ecosystem='npm' AND p2.name='cookie-parser' AND p2.ecosystem='npm' ON CONFLICT DO NOTHING;
    INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
    SELECT 'package', p1.id, 'package', p2.id, 'depends_on', false
    FROM packages p1, packages p2 WHERE p1.name='fastapi' AND p1.ecosystem='pypi' AND p2.name='pydantic' AND p2.ecosystem='pypi' ON CONFLICT DO NOTHING;
    INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
    SELECT 'package', p1.id, 'package', p2.id, 'depends_on', false
    FROM packages p1, packages p2 WHERE p1.name='flask' AND p1.ecosystem='pypi' AND p2.name='jinja2' AND p2.ecosystem='pypi' ON CONFLICT DO NOTHING;
    INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
    SELECT 'package', p1.id, 'package', p2.id, 'depends_on', false
    FROM packages p1, packages p2 WHERE p1.name='django' AND p1.ecosystem='pypi' AND p2.name='jinja2' AND p2.ecosystem='pypi' ON CONFLICT DO NOTHING;
    INSERT INTO dependency_edges (source_type, source_id, target_type, target_id, edge_type, is_direct)
    SELECT 'package', p1.id, 'package', p2.id, 'depends_on', false
    FROM packages p1, packages p2 WHERE p1.name='django' AND p1.ecosystem='pypi' AND p2.name='sqlalchemy' AND p2.ecosystem='pypi' ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Total edges: %', (SELECT count(*) FROM dependency_edges);

    -- Create exposures
    -- lodash (critical, 5 services = large blast radius)
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('api-gateway','auth-service','user-profile','mobile-api','audit-log-service') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '60 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45801' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('api-gateway','mobile-api','notification-service','webhook-dispatcher') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '40 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45802' ON CONFLICT DO NOTHING;
    END LOOP;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '90 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45803' AND s.slug = 'mobile-api' ON CONFLICT DO NOTHING;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('api-gateway','auth-service','mobile-api') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '50 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45804' ON CONFLICT DO NOTHING;
    END LOOP;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '120 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45805' AND s.slug = 'auth-service' ON CONFLICT DO NOTHING;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('api-gateway','mobile-api') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '60 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45806' ON CONFLICT DO NOTHING;
    END LOOP;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '80 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45807' AND s.slug = 'notification-service' ON CONFLICT DO NOTHING;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '70 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45808' AND s.slug = 'webhook-dispatcher' ON CONFLICT DO NOTHING;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '100 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45809' AND s.slug = 'mobile-api' ON CONFLICT DO NOTHING;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('user-profile','audit-log-service') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '30 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45810' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('mobile-api','webhook-dispatcher') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '55 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45811' ON CONFLICT DO NOTHING;
    END LOOP;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '65 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45812' AND s.slug = 'audit-log-service' ON CONFLICT DO NOTHING;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '45 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45813' AND s.slug = 'mobile-api' ON CONFLICT DO NOTHING;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '70 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45814' AND s.slug = 'mobile-api' ON CONFLICT DO NOTHING;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('payment-processor','payment-validator','data-ingestion','reporting-service') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '35 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45815' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('payment-processor','reporting-service','billing-service') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '25 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45816' ON CONFLICT DO NOTHING;
    END LOOP;
    INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '20 days') FROM vulnerabilities v, services s WHERE v.cve_id = 'CVE-2024-45817' AND s.slug = 'billing-service' ON CONFLICT DO NOTHING;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('payment-validator','analytics-engine') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '40 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45818' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('payment-processor','payment-validator','billing-service') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '50 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45819' ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s_rec IN SELECT id FROM services WHERE slug IN ('analytics-engine','data-ingestion') LOOP
        INSERT INTO exposures (vulnerability_id, service_id, environment_id, exposure_type, status, detected_at) SELECT v.id, s_rec.id, prod_env_id, 'direct_dependency', 'open', now() - (random() * interval '28 days') FROM vulnerabilities v WHERE v.cve_id = 'CVE-2024-45820' ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Exposures: %', (SELECT count(*) FROM exposures);

    -- Compute risk assessments
    FOR exp_rec IN SELECT id, vulnerability_id, service_id, environment_id, detected_at FROM exposures LOOP
        SELECT INTO v_rec * FROM vulnerabilities WHERE id = exp_rec.vulnerability_id;
        SELECT INTO s_rec * FROM services WHERE id = exp_rec.service_id;
        days_since := EXTRACT(EPOCH FROM (now() - exp_rec.detected_at)) / 86400;
        blast := (SELECT count(*) FROM exposures e WHERE e.vulnerability_id = exp_rec.vulnerability_id);
        score := COALESCE((sev_weight->>v_rec.severity)::int, 10);
        IF s_rec.internet_facing THEN score := score + 10; END IF;
        IF v_rec.exploit_available THEN score := score + 15; END IF;
        IF NOT v_rec.fix_available THEN score := score + 10; END IF;
        score := score + COALESCE((crit_weight->>s_rec.criticality)::int, 5);
        score := score + COALESCE((data_weight->>s_rec.data_classification)::int, 4);
        score := score + LEAST(10, days_since::int / 7);
        score := score + LEAST(10, blast * 2);
        score := LEAST(100, GREATEST(0, score));
        level := 'low';
        IF score >= 80 THEN level := 'critical'; ELSIF score >= 60 THEN level := 'high'; ELSIF score >= 30 THEN level := 'medium'; END IF;
        INSERT INTO risk_assessments (exposure_id, risk_score, risk_level, factors, blast_radius, production_impact, internet_exposure)
        VALUES (exp_rec.id, score, level, jsonb_build_object('severity',v_rec.severity,'cvss_score',v_rec.cvss_score,'production',exp_rec.environment_id=prod_env_id,'internet_facing',s_rec.internet_facing,'exploit_available',v_rec.exploit_available,'fix_available',v_rec.fix_available,'criticality',s_rec.criticality,'data_classification',s_rec.data_classification,'days_since_detection',days_since::int,'blast_radius',blast), blast, exp_rec.environment_id=prod_env_id, s_rec.internet_facing) ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Risk assessments: %', (SELECT count(*) FROM risk_assessments);

    -- Audit log entries
    INSERT INTO audit_logs (entity_type, entity_id, action, actor, details) SELECT 'exposure', id, 'detected', 'system', jsonb_build_object('message','Vulnerability exposure detected during initial scan') FROM exposures LIMIT 10;

    RAISE NOTICE 'Seed complete!';
END $$;
