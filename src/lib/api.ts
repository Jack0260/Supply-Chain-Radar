import { supabase } from './supabase';
import type {
  Service, Package, Vulnerability, Exposure, RiskAssessment,
  DependencyEdge, OwnerTeam, ContainerImage, DeploymentEnvironment,
  RemediationTicket, Exception, AuditLog, Repository, SBOM,
} from '@/types';

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*, team:owner_teams(*), repository:repositories(*)')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchPackages(): Promise<Package[]> {
  const { data, error } = await supabase.from('packages').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchVulnerabilities(): Promise<Vulnerability[]> {
  const { data, error } = await supabase
    .from('vulnerabilities')
    .select('*, package:packages(*)')
    .order('cvss_score', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchExposures(): Promise<Exposure[]> {
  const { data, error } = await supabase
    .from('exposures')
    .select('*, vulnerability:vulnerabilities(*, package:packages(*)), service:services(*, team:owner_teams(*)), environment:deployment_environments(*)')
    .order('detected_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRiskAssessments(): Promise<RiskAssessment[]> {
  const { data, error } = await supabase.from('risk_assessments').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function fetchDependencyEdges(): Promise<DependencyEdge[]> {
  const { data, error } = await supabase.from('dependency_edges').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function fetchTeams(): Promise<OwnerTeam[]> {
  const { data, error } = await supabase.from('owner_teams').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchContainers(): Promise<ContainerImage[]> {
  const { data, error } = await supabase
    .from('container_images')
    .select('*, team:owner_teams(*)')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchEnvironments(): Promise<DeploymentEnvironment[]> {
  const { data, error } = await supabase.from('deployment_environments').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchRepositories(): Promise<Repository[]> {
  const { data, error } = await supabase
    .from('repositories')
    .select('*, team:owner_teams(*)')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchRemediationTickets(): Promise<RemediationTicket[]> {
  const { data, error } = await supabase
    .from('remediation_tickets')
    .select('*, assigned_team:owner_teams(*), exposure:exposures(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchExceptions(): Promise<Exception[]> {
  const { data, error } = await supabase
    .from('exceptions')
    .select('*, exposure:exposures(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
  let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (entityType && entityId) {
    query = query.eq('entity_type', entityType).eq('entity_id', entityId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchSBOMs(): Promise<SBOM[]> {
  const { data, error } = await supabase.from('sboms').select('*').order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRemediationTicket(
  exposureId: string,
  teamId: string,
  priority: string,
  dueDate: string,
  notes: string
): Promise<void> {
  const { error } = await supabase.from('remediation_tickets').insert({
    exposure_id: exposureId,
    assigned_team_id: teamId,
    priority,
    due_date: dueDate,
    notes,
    status: 'open',
  });
  if (error) throw error;

  await supabase.from('audit_logs').insert({
    entity_type: 'exposure',
    entity_id: exposureId,
    action: 'ticket_created',
    actor: 'analyst',
    details: { priority, due_date: dueDate, notes },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  exposureId: string
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'resolved' || status === 'verified') {
    updates.resolved_at = new Date().toISOString();
  }
  const { error } = await supabase.from('remediation_tickets').update(updates).eq('id', ticketId);
  if (error) throw error;

  if (status === 'verified') {
    await supabase.from('exposures').update({ status: 'remediated' }).eq('id', exposureId);
  }

  await supabase.from('audit_logs').insert({
    entity_type: 'ticket',
    entity_id: ticketId,
    action: status,
    actor: 'analyst',
    details: { exposure_id: exposureId },
  });
}

export async function createException(
  exposureId: string,
  reason: string,
  compensatingControl: string,
  expiresAt: string,
  approvedBy: string
): Promise<void> {
  const { error } = await supabase.from('exceptions').insert({
    exposure_id: exposureId,
    reason,
    compensating_control: compensatingControl,
    expires_at: expiresAt,
    approved_by: approvedBy,
    status: 'active',
  });
  if (error) throw error;

  await supabase.from('exposures').update({ status: 'exception' }).eq('id', exposureId);

  await supabase.from('audit_logs').insert({
    entity_type: 'exposure',
    entity_id: exposureId,
    action: 'exception_filed',
    actor: approvedBy,
    details: { reason, compensating_control: compensatingControl, expires_at: expiresAt },
  });
}

export async function uploadSBOM(
  serviceId: string,
  repositoryId: string | null,
  format: string,
  content: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('sboms').insert({
    service_id: serviceId,
    repository_id: repositoryId,
    format,
    content,
  });
  if (error) throw error;

  if (repositoryId) {
    await supabase.from('repositories').update({ sbom_coverage: true }).eq('id', repositoryId);
  }

  await supabase.from('audit_logs').insert({
    entity_type: 'sbom',
    entity_id: serviceId,
    action: 'sbom_uploaded',
    actor: 'analyst',
    details: { format, repository_id: repositoryId },
  });
}
