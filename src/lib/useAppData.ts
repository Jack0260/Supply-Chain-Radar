import { useEffect, useState, useCallback } from 'react';
import {
  fetchServices, fetchPackages, fetchVulnerabilities, fetchExposures,
  fetchRiskAssessments, fetchDependencyEdges, fetchTeams, fetchContainers,
  fetchEnvironments, fetchRepositories, fetchRemediationTickets, fetchExceptions,
  fetchSBOMs,
} from '@/lib/api';
import type {
  Service, Package, Vulnerability, Exposure, RiskAssessment,
  DependencyEdge, OwnerTeam, ContainerImage, DeploymentEnvironment,
  Repository, RemediationTicket, Exception, SBOM,
} from '@/types';

export interface AppData {
  services: Service[];
  packages: Package[];
  vulnerabilities: Vulnerability[];
  exposures: Exposure[];
  riskAssessments: RiskAssessment[];
  edges: DependencyEdge[];
  teams: OwnerTeam[];
  containers: ContainerImage[];
  environments: DeploymentEnvironment[];
  repositories: Repository[];
  tickets: RemediationTicket[];
  exceptions: Exception[];
  sboms: SBOM[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAppData(): AppData {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [edges, setEdges] = useState<DependencyEdge[]>([]);
  const [teams, setTeams] = useState<OwnerTeam[]>([]);
  const [containers, setContainers] = useState<ContainerImage[]>([]);
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [tickets, setTickets] = useState<RemediationTicket[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [sboms, setSboms] = useState<SBOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        svcs, pkgs, vulns, exps, risks, edg, tms, ctrs, envs, repos, tckts, excs, sbm,
      ] = await Promise.all([
        fetchServices(), fetchPackages(), fetchVulnerabilities(), fetchExposures(),
        fetchRiskAssessments(), fetchDependencyEdges(), fetchTeams(), fetchContainers(),
        fetchEnvironments(), fetchRepositories(), fetchRemediationTickets(), fetchExceptions(),
        fetchSBOMs(),
      ]);
      setServices(svcs);
      setPackages(pkgs);
      setVulnerabilities(vulns);
      setExposures(exps);
      setRiskAssessments(risks);
      setEdges(edg);
      setTeams(tms);
      setContainers(ctrs);
      setEnvironments(envs);
      setRepositories(repos);
      setTickets(tckts);
      setExceptions(excs);
      setSboms(sbm);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    services, packages, vulnerabilities, exposures, riskAssessments,
    edges, teams, containers, environments, repositories, tickets, exceptions, sboms,
    loading, error, refresh: load,
  };
}
