import type { Severity, RiskFactors } from '@/types';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
};

const CRITICALITY_WEIGHTS: Record<string, number> = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
};

const DATA_WEIGHTS: Record<string, number> = {
  restricted: 12,
  confidential: 8,
  internal: 4,
  public: 1,
};

export interface ScoreInput {
  severity: Severity;
  cvss_score: number;
  production: boolean;
  internet_facing: boolean;
  exploit_available: boolean;
  fix_available: boolean;
  criticality: string;
  data_classification: string;
  days_since_detection: number;
  blast_radius: number;
  has_compensating_control?: boolean;
}

export interface ScoreResult {
  score: number;
  level: Severity;
  factors: { label: string; value: number; max: number }[];
}

export function calculateRiskScore(input: ScoreInput): ScoreResult {
  let score = 0;
  const factors: { label: string; value: number; max: number }[] = [];

  const sevWeight = SEVERITY_WEIGHTS[input.severity] ?? 10;
  score += sevWeight;
  factors.push({ label: 'Severity', value: sevWeight, max: 40 });

  if (input.production) {
    score += 10;
    factors.push({ label: 'Production Impact', value: 10, max: 10 });
  } else {
    factors.push({ label: 'Production Impact', value: 0, max: 10 });
  }

  if (input.internet_facing) {
    score += 10;
    factors.push({ label: 'Internet Facing', value: 10, max: 10 });
  } else {
    factors.push({ label: 'Internet Facing', value: 0, max: 10 });
  }

  if (input.exploit_available) {
    score += 15;
    factors.push({ label: 'Exploit Available', value: 15, max: 15 });
  } else {
    factors.push({ label: 'Exploit Available', value: 0, max: 15 });
  }

  if (!input.fix_available) {
    score += 10;
    factors.push({ label: 'No Fix Available', value: 10, max: 10 });
  } else {
    factors.push({ label: 'No Fix Available', value: 0, max: 10 });
  }

  const critWeight = CRITICALITY_WEIGHTS[input.criticality] ?? 5;
  score += critWeight;
  factors.push({ label: 'Asset Criticality', value: critWeight, max: 15 });

  const dataWeight = DATA_WEIGHTS[input.data_classification] ?? 4;
  score += dataWeight;
  factors.push({ label: 'Data Classification', value: dataWeight, max: 12 });

  const ageWeight = Math.min(10, Math.floor(input.days_since_detection / 7));
  score += ageWeight;
  factors.push({ label: 'Age (days since detection)', value: ageWeight, max: 10 });

  const blastWeight = Math.min(10, input.blast_radius * 2);
  score += blastWeight;
  factors.push({ label: 'Blast Radius', value: blastWeight, max: 10 });

  if (input.has_compensating_control) {
    score -= 15;
    factors.push({ label: 'Compensating Control', value: -15, max: 0 });
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  let level: Severity = 'low';
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 30) level = 'medium';

  return { score, level, factors };
}

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return 'text-danger-500 bg-danger-500/10 border-danger-500/20';
    case 'high': return 'text-warning-500 bg-warning-500/10 border-warning-500/20';
    case 'medium': return 'text-primary-500 bg-primary-500/10 border-primary-500/20';
    case 'low': return 'text-dark-400 bg-dark-400/10 border-dark-400/20';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-danger-500';
  if (score >= 60) return 'text-warning-500';
  if (score >= 30) return 'text-primary-500';
  return 'text-dark-400';
}

export function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-danger-500';
  if (score >= 60) return 'bg-warning-500';
  if (score >= 30) return 'bg-primary-500';
  return 'bg-dark-400';
}

export function deduplicateVulnerabilities<T extends { cve_id: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.cve_id)) return false;
    seen.add(item.cve_id);
    return true;
  });
}
