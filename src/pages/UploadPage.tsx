import { useState, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { Card, Button, Spinner, Badge } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';
import { detectAndParse, type ParsedSBOM } from '@/lib/sbom-parser';
import { uploadSBOM } from '@/lib/api';

export function UploadPage() {
  const data = useAppData();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedSBOM | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
    setUploaded(false);
    try {
      const text = await file.text();
      const parsed = detectAndParse(text, file.name);
      if (parsed.packages.length === 0) {
        setError('No packages detected in file. Supported formats: package-lock.json, requirements.txt, pyproject.toml, CycloneDX, SPDX, container manifests.');
      } else {
        setResult(parsed);
      }
    } catch {
      setError('Failed to read file. Please ensure it is a valid text or JSON file.');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!result || !selectedService) return;
    setUploading(true);
    setError(null);
    try {
      const svc = data.services.find((s) => s.id === selectedService);
      await uploadSBOM(selectedService, svc?.repository_id ?? null, result.format, { packages: result.packages, metadata: result.metadata });
      setUploaded(true);
      data.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (data.loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Upload SBOM / Dependency Manifest</h1>
        <p className="text-sm text-dark-400 mt-1">Ingest SBOM files or dependency manifests to update the dependency graph</p>
      </div>

      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${dragOver ? 'border-primary-500 bg-primary-500/5' : 'border-dark-200 dark:border-dark-700'}`}
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center py-12 text-center cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {parsing ? (
            <Spinner size={32} />
          ) : (
            <>
              <UploadCloud size={48} className="text-dark-300 dark:text-dark-600 mb-3" />
              <p className="text-sm font-medium text-dark-700 dark:text-dark-200">Drop file here or click to browse</p>
              <p className="text-xs text-dark-400 mt-1">Supports: package-lock.json, requirements.txt, pyproject.toml, CycloneDX, SPDX, container manifests</p>
              <input id="file-input" type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-danger-500/30 bg-danger-500/5">
          <div className="flex items-center gap-2 text-danger-500">
            <AlertCircle size={18} />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {result && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-primary-500" />
            <h3 className="text-sm font-semibold">Parsed: {result.format}</h3>
            <Badge>{result.packages.length} packages</Badge>
          </div>

          <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-dark-200 dark:border-dark-800">
            <table className="w-full text-xs">
              <thead className="bg-dark-50 dark:bg-dark-800 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-dark-400 font-medium">Package</th>
                  <th className="text-left px-3 py-2 text-dark-400 font-medium">Version</th>
                  <th className="text-left px-3 py-2 text-dark-400 font-medium">Ecosystem</th>
                </tr>
              </thead>
              <tbody>
                {result.packages.slice(0, 50).map((pkg, i) => (
                  <tr key={i} className="border-t border-dark-100 dark:border-dark-800">
                    <td className="px-3 py-1.5 text-dark-700 dark:text-dark-200">{pkg.name}</td>
                    <td className="px-3 py-1.5 font-mono text-dark-500">{pkg.version}</td>
                    <td className="px-3 py-1.5"><Badge>{pkg.ecosystem}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Associate with service</label>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}
              className="w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm">
              <option value="">Select service...</option>
              {data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button onClick={handleUpload} disabled={!selectedService || uploading}>
              {uploading ? <Spinner size={16} /> : uploaded ? <CheckCircle2 size={16} /> : <UploadCloud size={16} />}
              {uploaded ? 'Uploaded Successfully' : 'Upload SBOM'}
            </Button>
          </div>
        </Card>
      )}

      {/* Existing SBOMs */}
      <Card>
        <div className="flex items-center gap-2 mb-3"><Package size={16} className="text-dark-400" /><h3 className="text-sm font-semibold">Uploaded SBOMs</h3></div>
        {data.sboms.length === 0 ? (
          <p className="text-xs text-dark-400">No SBOMs uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {data.sboms.map((sbom) => (
              <div key={sbom.id} className="flex items-center gap-3 text-xs border-l-2 border-primary-500/30 pl-3">
                <FileText size={12} className="text-dark-400" />
                <span className="font-medium text-dark-700 dark:text-dark-200">{sbom.format}</span>
                <span className="text-dark-400">{data.services.find((s) => s.id === sbom.service_id)?.name ?? 'Unknown'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
