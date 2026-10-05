import type { ReactNode } from 'react';
import type { Severity } from '@/types';

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | Severity }) {
  const styles: Record<string, string> = {
    default: 'bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-300',
    critical: 'bg-danger-500/10 text-danger-500 border border-danger-500/20',
    high: 'bg-warning-500/10 text-warning-500 border border-warning-500/20',
    medium: 'bg-primary-500/10 text-primary-500 border border-primary-500/20',
    low: 'bg-dark-400/10 text-dark-400 border border-dark-400/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon, trend, color = 'primary' }: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'accent';
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary-500 bg-primary-500/10',
    danger: 'text-danger-500 bg-danger-500/10',
    warning: 'text-warning-500 bg-warning-500/10',
    success: 'text-success-500 bg-success-500/10',
    accent: 'text-accent-500 bg-accent-500/10',
  };
  return (
    <Card className="flex items-center gap-4">
      {icon && <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-sm text-dark-500 dark:text-dark-400">{label}</p>
        <p className="text-2xl font-bold text-dark-900 dark:text-dark-50">{value}</p>
        {trend && <p className="text-xs text-dark-400 mt-0.5">{trend}</p>}
      </div>
    </Card>
  );
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className = '' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-dark-900 dark:text-dark-50',
    danger: 'bg-danger-600 hover:bg-danger-700 text-white',
    ghost: 'hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-700 dark:text-dark-300',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: size * 2 }}>
      <div
        className="animate-spin rounded-full border-2 border-dark-200 dark:border-dark-700 border-t-primary-500"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-3 text-dark-300 dark:text-dark-600">{icon}</div>}
      <p className="text-lg font-medium text-dark-700 dark:text-dark-200">{title}</p>
      {description && <p className="text-sm text-dark-400 mt-1">{description}</p>}
    </div>
  );
}

export function RiskScoreBadge({ score, level }: { score: number; level: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-danger-500 text-white',
    high: 'bg-warning-500 text-white',
    medium: 'bg-primary-500 text-white',
    low: 'bg-dark-400 text-white',
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${colors[level] ?? colors.low}`}>
        {score}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">{title}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'primary' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-500',
    danger: 'bg-danger-500',
    warning: 'bg-warning-500',
    success: 'bg-success-500',
  };
  return (
    <div className="h-2 w-full rounded-full bg-dark-100 dark:bg-dark-800 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorMap[color] ?? colorMap.primary}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
