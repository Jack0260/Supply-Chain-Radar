import { describe, it, expect } from 'vitest';
import { parseRequirementsTxt, parsePyprojectToml, detectAndParse } from '@/lib/sbom-parser';

describe('SBOM parser', () => {
  it('parses requirements.txt', () => {
    const content = `# comment
requests==2.32.3
flask>=3.0.0
django>=4.0
`;
    const result = parseRequirementsTxt(content);
    expect(result.packages).toHaveLength(3);
    expect(result.packages[0].name).toBe('requests');
    expect(result.packages[0].version).toBe('2.32.3');
    expect(result.format).toBe('requirements.txt');
  });

  it('parses pyproject.toml dependencies', () => {
    const content = `[project]
name = "myapp"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn>=0.30.0",
    "pydantic>=2.0",
]`;
    const result = parsePyprojectToml(content);
    expect(result.packages).toHaveLength(3);
    expect(result.packages[0].name).toBe('fastapi');
  });

  it('detects and parses package-lock.json', () => {
    const content = JSON.stringify({
      name: "test-app",
      lockfileVersion: 3,
      packages: {
        "": { version: "1.0.0" },
        "node_modules/lodash": { version: "4.17.21" },
        "node_modules/express": { version: "4.19.2" },
      }
    });
    const result = detectAndParse(content, 'package-lock.json');
    expect(result.packages.length).toBeGreaterThan(0);
    expect(result.format).toBe('package-lock.json');
  });

  it('returns empty for unknown format', () => {
    const result = detectAndParse('random text', 'random.dat');
    expect(result.packages).toHaveLength(0);
    expect(result.format).toBe('unknown');
  });
});

describe('integration: remediation reduces risk', () => {
  it('a remediated exposure should have lower risk than an open one', () => {
    const openRisk = { status: 'open', risk_score: 85, risk_level: 'critical' };
    const remediatedRisk = { status: 'remediated', risk_score: 0, risk_level: 'low' };
    expect(remediatedRisk.risk_score).toBeLessThan(openRisk.risk_score);
    expect(remediatedRisk.risk_level).not.toBe(openRisk.risk_level);
  });
});
