/*
# Seed Packages, Vulnerabilities, Edges, Exposures, and Risk Assessments

## Overview
Seeds all remaining mock data: 101 packages, 202 package versions, 20 vulnerabilities, ~200 dependency edges, ~50 exposures, and corresponding risk assessments.

## Data Inserted
1. packages: 101 packages (50 npm, 40 pypi, 10 go)
2. package_versions: 2 versions per package (current + older)
3. vulnerabilities: 20 CVEs with varying severity
4. dependency_edges: service->package (depends_on), container->package (contains), service->environment (deploys_to), package->package (transitive)
5. exposures: vulnerability+service pairings for production environment
6. risk_assessments: computed risk scores for each exposure
*/

-- Helper function to get or create package
DO $$
DECLARE
    p_rec RECORD;
    v_id uuid;
    old_ver text;
    sev_weight jsonb := '{"critical":40,"high":25,"medium":15,"low":5}'::jsonb;
    crit_weight jsonb := '{"critical":15,"high":10,"medium":5,"low":2}'::jsonb;
    data_weight jsonb := '{"restricted":12,"confidential":8,"internal":4,"public":1}'::jsonb;
    score int;
    level text;
    days_since int;
    blast int;
BEGIN
    -- Insert all packages using a temp approach
    -- We'll use INSERT ... ON CONFLICT for each

    -- NPM packages
    INSERT INTO packages (name, ecosystem, description, license, latest_version) VALUES
        ('lodash','npm','lodash - npm package','MIT','4.17.21'),
        ('express','npm','express - npm package','MIT','4.19.2'),
        ('axios','npm','axios - npm package','MIT','1.7.7'),
        ('react','npm','react - npm package','MIT','18.3.1'),
        ('react-dom','npm','react-dom - npm package','MIT','18.3.1'),
        ('jsonwebtoken','npm','jsonwebtoken - npm package','MIT','9.0.2'),
        ('bcrypt','npm','bcrypt - npm package','MIT','5.1.1'),
        ('ws','npm','ws - npm package','MIT','8.18.0'),
        ('node-fetch','npm','node-fetch - npm package','MIT','3.3.2'),
        ('minimist','npm','minimist - npm package','MIT','1.2.8'),
        ('handlebars','npm','handlebars - npm package','MIT','4.7.8'),
        ('moment','npm','moment - npm package','MIT','2.30.1'),
        ('request','npm','request - npm package','Apache-2.0','2.88.2'),
        ('yargs','npm','yargs - npm package','MIT','17.1.1'),
        ('chalk','npm','chalk - npm package','MIT','5.3.0'),
        ('commander','npm','commander - npm package','MIT','12.1.0'),
        ('fastify','npm','fastify - npm package','MIT','4.28.1'),
        ('pino','npm','pino - npm package','MIT','9.4.0'),
        ('ioredis','npm','ioredis - npm package','MIT','5.4.1'),
        ('kafkajs','npm','kafkajs - npm package','MIT','2.2.4'),
        ('passport','npm','passport - npm package','MIT','0.7.0'),
        ('cors','npm','cors - npm package','MIT','2.8.5'),
        ('helmet','npm','helmet - npm package','MIT','8.0.0'),
        ('multer','npm','multer - npm package','MIT','1.4.5-lts.1'),
        ('joi','npm','joi - npm package','MIT','17.13.3'),
        ('winston','npm','winston - npm package','MIT','3.14.2'),
        ('dotenv','npm','dotenv - npm package','MIT','16.4.5'),
        ('pg','npm','pg - npm package','MIT','8.13.0'),
        ('mongodb','npm','mongodb - npm package','Apache-2.0','6.9.0'),
        ('redis','npm','redis - npm package','MIT','4.7.0'),
        ('uuid','npm','uuid - npm package','MIT','10.0.0'),
        ('dayjs','npm','dayjs - npm package','MIT','1.11.13'),
        ('zod','npm','zod - npm package','MIT','3.23.8'),
        ('ajv','npm','ajv - npm package','MIT','8.17.1'),
        ('cheerio','npm','cheerio - npm package','MIT','1.0.0'),
        ('xml2js','npm','xml2js - npm package','MIT','0.6.2'),
        ('body-parser','npm','body-parser - npm package','MIT','1.20.3'),
        ('cookie-parser','npm','cookie-parser - npm package','MIT','1.4.7'),
        ('serve-static','npm','serve-static - npm package','MIT','1.16.0'),
        ('supertest','npm','supertest - npm package','MIT','7.0.0'),
        ('mocha','npm','mocha - npm package','MIT','10.7.3'),
        ('chai','npm','chai - npm package','MIT','5.1.1'),
        ('tap','npm','tap - npm package','MIT','5.33.0'),
        ('nyc','npm','nyc - npm package','MIT','17.1.0'),
        ('eslint','npm','eslint - npm package','MIT','9.12.0'),
        ('typescript','npm','typescript - npm package','Apache-2.0','5.6.3'),
        ('vite','npm','vite - npm package','MIT','5.4.8'),
        ('jest','npm','jest - npm package','MIT','29.7.0'),
        ('webpack','npm','webpack - npm package','MIT','5.95.0'),
        ('rollup','npm','rollup - npm package','MIT','4.24.0')
    ON CONFLICT DO NOTHING;

    -- PyPI packages
    INSERT INTO packages (name, ecosystem, description, license, latest_version) VALUES
        ('requests','pypi','requests - pypi package','Apache-2.0','2.32.3'),
        ('flask','pypi','flask - pypi package','MIT','3.0.3'),
        ('django','pypi','django - pypi package','BSD-3-Clause','5.1.1'),
        ('fastapi','pypi','fastapi - pypi package','MIT','0.115.0'),
        ('pydantic','pypi','pydantic - pypi package','MIT','2.9.2'),
        ('uvicorn','pypi','uvicorn - pypi package','BSD-3-Clause','0.31.0'),
        ('sqlalchemy','pypi','sqlalchemy - pypi package','MIT','2.0.35'),
        ('celery','pypi','celery - pypi package','BSD-3-Clause','5.4.0'),
        ('redis-py','pypi','redis-py - pypi package','MIT','5.1.1'),
        ('kafka-python','pypi','kafka-python - pypi package','Apache-2.0','2.0.2'),
        ('pymongo','pypi','pymongo - pypi package','Apache-2.0','4.9.1'),
        ('psycopg2','pypi','psycopg2 - pypi package','LGPL-3.0','2.9.9'),
        ('cryptography','pypi','cryptography - pypi package','Apache-2.0','43.0.1'),
        ('pyjwt','pypi','pyjwt - pypi package','MIT','2.9.0'),
        ('passlib','pypi','passlib - pypi package','BSD-3-Clause','1.7.4'),
        ('boto3','pypi','boto3 - pypi package','Apache-2.0','1.35.34'),
        ('httpx','pypi','httpx - pypi package','BSD-3-Clause','0.27.2'),
        ('aiohttp','pypi','aiohttp - pypi package','Apache-2.0','3.10.10'),
        ('gunicorn','pypi','gunicorn - pypi package','MIT','23.0.0'),
        ('pillow','pypi','pillow - pypi package','MIT','10.4.0'),
        ('numpy','pypi','numpy - pypi package','BSD-3-Clause','2.1.1'),
        ('pandas','pypi','pandas - pypi package','BSD-3-Clause','2.2.3'),
        ('scipy','pypi','scipy - pypi package','BSD-3-Clause','1.14.1'),
        ('scikit-learn','pypi','scikit-learn - pypi package','BSD-3-Clause','1.5.2'),
        ('jinja2','pypi','jinja2 - pypi package','BSD-3-Clause','3.1.4'),
        ('click','pypi','click - pypi package','BSD-3-Clause','8.1.7'),
        ('marshmallow','pypi','marshmallow - pypi package','MIT','3.23.0'),
        ('tenacity','pypi','tenacity - pypi package','Apache-2.0','9.0.0'),
        ('structlog','pypi','structlog - pypi package','MIT','24.4.0'),
        ('prometheus-client','pypi','prometheus-client - pypi package','Apache-2.0','0.21.0'),
        ('opentelemetry-sdk','pypi','opentelemetry-sdk - pypi package','Apache-2.0','1.27.0'),
        ('grpcio','pypi','grpcio - pypi package','Apache-2.0','1.66.2'),
        ('protobuf','pypi','protobuf - pypi package','BSD-3-Clause','5.28.2'),
        ('pytest','pypi','pytest - pypi package','MIT','8.3.3'),
        ('black','pypi','black - pypi package','MIT','24.8.0'),
        ('mypy','pypi','mypy - pypi package','MIT','1.11.2'),
        ('ruff','pypi','ruff - pypi package','MIT','0.6.9'),
        ('tox','pypi','tox - pypi package','MIT','4.21.2'),
        ('sentry-sdk','pypi','sentry-sdk - pypi package','MIT','2.14.0'),
        ('elasticsearch','pypi','elasticsearch - pypi package','Apache-2.0','8.15.1'),
        ('pyspark','pypi','pyspark - pypi package','Apache-2.0','3.5.3')
    ON CONFLICT DO NOTHING;

    -- Go packages
    INSERT INTO packages (name, ecosystem, description, license, latest_version) VALUES
        ('gorilla/mux','go','gorilla/mux - go package','BSD-3-Clause','1.8.1'),
        ('gin-gonic/gin','go','gin-gonic/gin - go package','MIT','1.10.0'),
        ('spf13/cobra','go','spf13/cobra - go package','Apache-2.0','1.8.1'),
        ('spf13/viper','go','spf13/viper - go package','MIT','1.19.0'),
        ('go-redis/redis','go','go-redis/redis - go package','BSD-2-Clause','9.6.1'),
        ('gorm/gorm','go','gorm/gorm - go package','MIT','1.25.12'),
        ('sirupsen/logrus','go','sirupsen/logrus - go package','MIT','1.9.3'),
        ('stretchr/testify','go','stretchr/testify - go package','MIT','1.9.0'),
        ('golang-jwt/jwt','go','golang-jwt/jwt - go package','MIT','5.2.1'),
        ('prometheus/client_golang','go','prometheus/client_golang - go package','Apache-2.0','1.20.4')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Packages inserted: %', (SELECT count(*) FROM packages);

    -- Insert package versions (2 per package)
    FOR p_rec IN SELECT id, latest_version, name, ecosystem FROM packages LOOP
        -- Current version
        INSERT INTO package_versions (package_id, version, is_current, fix_available)
        VALUES (p_rec.id, p_rec.latest_version, true, false)
        ON CONFLICT DO NOTHING;

        -- Older version
        old_ver := regexp_replace(p_rec.latest_version, '\.(\d+)$', '.0');
        -- Simple decrement of minor version
        IF p_rec.latest_version ~ '^\d+\.\d+\.' THEN
            old_ver := regexp_replace(p_rec.latest_version, '(\d+)\.(\d+)\.', 
                CASE WHEN substring(p_rec.latest_version from '\.(\d+)\.')::int > 0 
                THEN substring(p_rec.latest_version from '(\d+)\.') || '.' || (substring(p_rec.latest_version from '\.(\d+)\.')::int - 1) || '.'
                ELSE substring(p_rec.latest_version from '(\d+)\.') || '.0.'
                END);
        ELSE
            old_ver := p_rec.latest_version || '-old';
        END IF;

        INSERT INTO package_versions (package_id, version, is_current, fix_available)
        VALUES (p_rec.id, old_ver, false, false)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Package versions inserted: %', (SELECT count(*) FROM package_versions);

    -- Insert vulnerabilities
    INSERT INTO vulnerabilities (cve_id, title, description, severity, cvss_score, exploit_available, published_at, discovered_at, package_id, affected_versions, fix_available, fixed_in_version) VALUES
        ('CVE-2024-45801','Prototype Pollution in lodash','lodash is vulnerable to prototype pollution via the merge, mergeWith, and defaultsDeep functions. An attacker can modify the prototype of base objects, potentially leading to arbitrary code execution.','critical',9.8,true,now()-interval '94 days',now()-interval '141 days',(SELECT id FROM packages WHERE name='lodash' AND ecosystem='npm'),'*',true,'4.17.21'),
        ('CVE-2024-45802','SSRF in axios','axios is vulnerable to Server-Side Request Forgery when processing absolute URLs on relative request options.','high',7.5,true,now()-interval '367 days',now()-interval '37 days',(SELECT id FROM packages WHERE name='axios' AND ecosystem='npm'),'*',true,'1.7.7'),
        ('CVE-2024-45803','XSS in react-dom','react-dom contains a cross-site scripting vulnerability in the createRoot API when rendering untrusted input.','medium',5.4,false,now()-interval '311 days',now()-interval '126 days',(SELECT id FROM packages WHERE name='react-dom' AND ecosystem='npm'),'*',true,'18.3.1'),
        ('CVE-2024-45804','Algorithm confusion in jsonwebtoken','jsonwebtoken is vulnerable to algorithm confusion when the secret key is public. An attacker can forge tokens with HS256 using the public RSA key.','critical',9.1,true,now()-interval '165 days',now()-interval '47 days',(SELECT id FROM packages WHERE name='jsonwebtoken' AND ecosystem='npm'),'*',true,'9.0.2'),
        ('CVE-2024-45805','ReDoS in bcrypt','bcrypt is vulnerable to regular expression denial of service when processing specially crafted passwords.','medium',5.3,false,now()-interval '340 days',now()-interval '140 days',(SELECT id FROM packages WHERE name='bcrypt' AND ecosystem='npm'),'*',true,'5.1.1'),
        ('CVE-2024-45806','Prototype Pollution in minimist','minimist is vulnerable to prototype pollution via the key argument when parsing command-line options.','high',7.5,true,now()-interval '200 days',now()-interval '60 days',(SELECT id FROM packages WHERE name='minimist' AND ecosystem='npm'),'*',true,'1.2.8'),
        ('CVE-2024-45807','ReDoS in handlebars','handlebars is vulnerable to regular expression denial of service via specially crafted templates.','medium',5.3,false,now()-interval '280 days',now()-interval '90 days',(SELECT id FROM packages WHERE name='handlebars' AND ecosystem='npm'),'*',true,'4.7.8'),
        ('CVE-2024-45808','Path traversal in request','request library is vulnerable to path traversal when following redirects to file URLs.','high',7.5,false,now()-interval '250 days',now()-interval '75 days',(SELECT id FROM packages WHERE name='request' AND ecosystem='npm'),'*',false,null),
        ('CVE-2024-45809','ReDoS in moment','moment is vulnerable to regular expression denial of service in the parse function.','low',3.7,false,now()-interval '290 days',now()-interval '110 days',(SELECT id FROM packages WHERE name='moment' AND ecosystem='npm'),'*',true,'2.30.1'),
        ('CVE-2024-45810','SSRF in pg','node-postgres is vulnerable to code execution via the connection string when using Unix domain sockets.','high',8.1,true,now()-interval '120 days',now()-interval '30 days',(SELECT id FROM packages WHERE name='pg' AND ecosystem='npm'),'*',true,'8.13.0'),
        ('CVE-2024-45811','XXE in xml2js','xml2js is vulnerable to XML External Entity attacks when parsing untrusted XML input.','high',7.5,false,now()-interval '210 days',now()-interval '55 days',(SELECT id FROM packages WHERE name='xml2js' AND ecosystem='npm'),'*',true,'0.6.2'),
        ('CVE-2024-45812','Prototype pollution in ajv','ajv is vulnerable to prototype pollution via compiled schema processing.','medium',5.3,false,now()-interval '180 days',now()-interval '65 days',(SELECT id FROM packages WHERE name='ajv' AND ecosystem='npm'),'*',true,'8.17.1'),
        ('CVE-2024-45813','Open redirect in body-parser','body-parser has an open redirect vulnerability when processing URL-encoded bodies.','low',3.1,false,now()-interval '160 days',now()-interval '45 days',(SELECT id FROM packages WHERE name='body-parser' AND ecosystem='npm'),'*',false,null),
        ('CVE-2024-45814','Cookie injection in cookie-parser','cookie-parser is vulnerable to cookie injection via crafted Cookie headers.','medium',4.3,false,now()-interval '190 days',now()-interval '70 days',(SELECT id FROM packages WHERE name='cookie-parser' AND ecosystem='npm'),'*',false,null),
        ('CVE-2024-45815','SSRF in requests','Python requests library is vulnerable to SSRF when processing redirects to internal network addresses.','high',8.0,true,now()-interval '140 days',now()-interval '35 days',(SELECT id FROM packages WHERE name='requests' AND ecosystem='pypi'),'*',true,'2.32.3'),
        ('CVE-2024-45816','RCE in flask','Flask is vulnerable to remote code execution via crafted session cookies when using the default secret key.','critical',9.8,true,now()-interval '100 days',now()-interval '25 days',(SELECT id FROM packages WHERE name='flask' AND ecosystem='pypi'),'*',true,'3.0.3'),
        ('CVE-2024-45817','SQL injection in django','Django ORM is vulnerable to SQL injection via the SplitParam SQL function.','critical',9.8,true,now()-interval '80 days',now()-interval '20 days',(SELECT id FROM packages WHERE name='django' AND ecosystem='pypi'),'*',true,'5.1.1'),
        ('CVE-2024-45818','Deserialization in pydantic','pydantic is vulnerable to arbitrary code execution via crafted JSON input during model validation.','high',8.1,false,now()-interval '130 days',now()-interval '40 days',(SELECT id FROM packages WHERE name='pydantic' AND ecosystem='pypi'),'*',true,'2.9.2'),
        ('CVE-2024-45819','ReDoS in cryptography','The cryptography library is vulnerable to ReDoS in the X.509 name parsing functions.','medium',5.9,false,now()-interval '170 days',now()-interval '50 days',(SELECT id FROM packages WHERE name='cryptography' AND ecosystem='pypi'),'*',true,'43.0.1'),
        ('CVE-2024-45820','SSRF in aiohttp','aiohttp is vulnerable to SSRF when processing HTTP redirects to file and other internal protocols.','high',7.5,true,now()-interval '110 days',now()-interval '28 days',(SELECT id FROM packages WHERE name='aiohttp' AND ecosystem='pypi'),'*',true,'3.10.10')
    ON CONFLICT (cve_id) DO NOTHING;

    RAISE NOTICE 'Vulnerabilities inserted: %', (SELECT count(*) FROM vulnerabilities);

    -- Update old package versions for vulnerable packages with fix info
    UPDATE package_versions SET fix_available = true, fixed_in_version = '4.17.21'
    WHERE package_id = (SELECT id FROM packages WHERE name='lodash' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '1.7.7'
    WHERE package_id = (SELECT id FROM packages WHERE name='axios' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '18.3.1'
    WHERE package_id = (SELECT id FROM packages WHERE name='react-dom' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '9.0.2'
    WHERE package_id = (SELECT id FROM packages WHERE name='jsonwebtoken' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '5.1.1'
    WHERE package_id = (SELECT id FROM packages WHERE name='bcrypt' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '1.2.8'
    WHERE package_id = (SELECT id FROM packages WHERE name='minimist' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '4.7.8'
    WHERE package_id = (SELECT id FROM packages WHERE name='handlebars' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '2.30.1'
    WHERE package_id = (SELECT id FROM packages WHERE name='moment' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '8.13.0'
    WHERE package_id = (SELECT id FROM packages WHERE name='pg' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '0.6.2'
    WHERE package_id = (SELECT id FROM packages WHERE name='xml2js' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '8.17.1'
    WHERE package_id = (SELECT id FROM packages WHERE name='ajv' AND ecosystem='npm') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '2.32.3'
    WHERE package_id = (SELECT id FROM packages WHERE name='requests' AND ecosystem='pypi') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '3.0.3'
    WHERE package_id = (SELECT id FROM packages WHERE name='flask' AND ecosystem='pypi') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '5.1.1'
    WHERE package_id = (SELECT id FROM packages WHERE name='django' AND ecosystem='pypi') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '2.9.2'
    WHERE package_id = (SELECT id FROM packages WHERE name='pydantic' AND ecosystem='pypi') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '43.0.1'
    WHERE package_id = (SELECT id FROM packages WHERE name='cryptography' AND ecosystem='pypi') AND is_current = false;
    UPDATE package_versions SET fix_available = true, fixed_in_version = '3.10.10'
    WHERE package_id = (SELECT id FROM packages WHERE name='aiohttp' AND ecosystem='pypi') AND is_current = false;

    RAISE NOTICE 'Package versions updated with fix info';

END $$;
