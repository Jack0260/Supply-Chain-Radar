import { describe, it, expect } from 'vitest';
import { calculateRiskScore, deduplicateVulnerabilities } from '@/lib/risk';

describe('risk scoring', () => {
  it('scores a critical production exploit with high blast radius as critical', () => {
    const result = calculateRiskScore({
      severity: 'critical',
      cvss_score: 9.8,
      production: true,
      internet_facing: true,
      exploit_available: true,
      fix_available: true,
      criticality: 'critical',
      data_classification: 'restricted',
      days_since_detection: 60,
      blast_radius: 5,
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.level).toBe('critical');
  });

  it('scores a low-severity internal issue as low', () => {
    const result = calculateRiskScore({
      severity: 'low',
      cvss_score: 2.0,
      production: false,
      internet_facing: false,
      exploit_available: false,
      fix_available: true,
      criticality: 'low',
      data_classification: 'internal',
      days_since_detection: 5,
      blast_radius: 0,
    });
    expect(result.score).toBeLessThan(30);
    expect(result.level).toBe('low');
  });

  it('reduces score with compensating control', () => {
    const without = calculateRiskScore({
      severity: 'high', cvss_score: 7.5, production: true, internet_facing: true,
      exploit_available: true, fix_available: false, criticality: 'high',
      data_classification: 'confidential', days_since_detection: 30, blast_radius: 3,
    });
    const withControl = calculateRiskScore({
      severity: 'high', cvss_score: 7.5, production: true, internet_facing: true,
      exploit_available: true, fix_available: false, criticality: 'high',
      data_classification: 'confidential', days_since_detection: 30, blast_radius: 3,
      has_compensating_control: true,
    });
    expect(withControl.score).toBeLessThan(without.score);
    expect(without.score - withControl.score).toBe(15);
  });

  it('clamps score between 0 and 100', () => {
    const result = calculateRiskScore({
      severity: 'critical', cvss_score: 10, production: true, internet_facing: true,
      exploit_available: true, fix_available: false, criticality: 'critical',
      data_classification: 'restricted', days_since_detection: 365, blast_radius: 20,
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('vulnerability deduplication', () => {
  it('removes duplicate CVEs', () => {
    const vulns = [
      { cve_id: 'CVE-2024-001', title: 'A' },
      { cve_id: 'CVE-2024-001', title: 'A dup' },
      { cve_id: 'CVE-2024-002', title: 'B' },
    ];
    const result = deduplicateVulnerabilities(vulns);
    expect(result).toHaveLength(2);
    expect(result[0].cve_id).toBe('CVE-2024-001');
  });
});
