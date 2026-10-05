export interface ParsedPackage {
  name: string;
  version: string;
  ecosystem: string;
}

export interface ParsedSBOM {
  packages: ParsedPackage[];
  format: string;
  metadata: Record<string, unknown>;
}

export function parsePackageLock(json: Record<string, unknown>): ParsedSBOM {
  const packages = json.packages as Record<string, { version?: string }> | undefined;
  const result: ParsedPackage[] = [];
  if (packages) {
    for (const [pkgPath, info] of Object.entries(packages)) {
      if (!pkgPath || pkgPath === '' || pkgPath.startsWith('node_modules/')) {
        const name = pkgPath.replace(/^node_modules\//, '').split('/').pop() || pkgPath;
        if (name && info.version) {
          result.push({ name, version: info.version, ecosystem: 'npm' });
        }
      }
    }
  }
  return { packages: result, format: 'package-lock.json', metadata: { name: json.name, version: json.version } };
}

export function parseRequirementsTxt(content: string): ParsedSBOM {
  const result: ParsedPackage[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*([>=<>!~]+\s*)?([\d.]+)/);
    if (match) {
      result.push({ name: match[1], version: match[3], ecosystem: 'pypi' });
    }
  }
  return { packages: result, format: 'requirements.txt', metadata: {} };
}

export function parsePyprojectToml(content: string): ParsedSBOM {
  const result: ParsedPackage[] = [];
  const inDeps = content.match(/\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (inDeps) {
    const depLines = inDeps[1].split('\n');
    for (const line of depLines) {
      const match = line.match(/"([a-zA-Z0-9_-]+)\s*([>=<>!~]+\s*)?([\d.]+)/);
      if (match) {
        result.push({ name: match[1], version: match[3], ecosystem: 'pypi' });
      }
    }
  }
  return { packages: result, format: 'pyproject.toml', metadata: {} };
}

export function parseCycloneDX(json: Record<string, unknown>): ParsedSBOM {
  const components = json.components as Array<Record<string, string>> | undefined;
  const result: ParsedPackage[] = [];
  if (components) {
    for (const comp of components) {
      if (comp.name && comp.version) {
        const eco = comp.type === 'library' ? 'npm' : 'npm';
        result.push({ name: comp.name, version: comp.version, ecosystem: comp['bom-ref']?.startsWith('pkg:pypi') ? 'pypi' : eco });
      }
    }
  }
  return { packages: result, format: 'CycloneDX', metadata: { bomFormat: json.bomFormat, specVersion: json.specVersion } };
}

export function parseSPDX(json: Record<string, unknown>): ParsedSBOM {
  const packages = json.packages as Array<Record<string, string>> | undefined;
  const result: ParsedPackage[] = [];
  if (packages) {
    for (const pkg of packages) {
      if (pkg.name && pkg.versionInfo) {
        result.push({ name: pkg.name, version: pkg.versionInfo, ecosystem: 'npm' });
      }
    }
  }
  return { packages: result, format: 'SPDX', metadata: { spdxVersion: json.spdxVersion } };
}

export function parseContainerManifest(json: Record<string, unknown>): ParsedSBOM {
  const layers = json.layers as Array<Record<string, unknown>> | undefined;
  const packages = json.packages as Array<Record<string, string>> | undefined;
  const result: ParsedPackage[] = [];
  if (packages) {
    for (const pkg of packages) {
      if (pkg.name && pkg.version) {
        result.push({ name: pkg.name, version: pkg.version, ecosystem: pkg.ecosystem || 'npm' });
      }
    }
  }
  return { packages: result, format: 'container-manifest', metadata: { image: json.image, layers: layers?.length || 0 } };
}

export function detectAndParse(content: string, filename: string): ParsedSBOM {
  const lower = filename.toLowerCase();
  try {
    const json = JSON.parse(content);
    if (json.bomFormat === 'CycloneDX') return parseCycloneDX(json);
    if (json.spdxVersion) return parseSPDX(json);
    if (json.packages && json.lockfileVersion !== undefined) return parsePackageLock(json);
    if (json.layers || json.image) return parseContainerManifest(json);
    if (lower.endsWith('.json')) return parseCycloneDX(json);
  } catch {
    if (lower.endsWith('.txt')) return parseRequirementsTxt(content);
    if (lower.endsWith('.toml')) return parsePyprojectToml(content);
  }
  return { packages: [], format: 'unknown', metadata: {} };
}
