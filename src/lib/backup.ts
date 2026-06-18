import type { AppState, JapanFinanceBackup } from '../types';
import { emptyState } from '../data/sampleBackup';

export function createExport(state: AppState): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString(), version: Math.max(5, state.version || 5) }, null, 2);
}

export function downloadBackup(state: AppState) {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
  const blob = new Blob([createExport(state)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `japanfinance-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<AppState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<JapanFinanceBackup>;
  return migrateBackup(parsed);
}

export function migrateBackup(raw: Partial<JapanFinanceBackup>): AppState {
  if (!raw || !Array.isArray(raw.entries)) throw new Error('Backup inválido: entries ausente.');
  const merged: AppState = {
    ...emptyState,
    ...raw,
    version: Number(raw.version || 5),
    exportedAt: raw.exportedAt || new Date().toISOString(),
    entries: raw.entries || [],
    settings: { ...emptyState.settings, ...(raw.settings || {}), customRules: { ...emptyState.settings.customRules, ...(raw.settings?.customRules || {}) }, teate: raw.settings?.teate || emptyState.settings.teate },
    gastos: { ...emptyState.gastos, ...(raw.gastos || {}) },
    cartao: raw.cartao ? { ...emptyState.cartao!, ...raw.cartao, lancamentos: raw.cartao.lancamentos || [] } : emptyState.cartao,
    taxVehicles: raw.taxVehicles || [],
    taxPayments: raw.taxPayments || [],
  };
  return merged;
}

export function backupStats(state: AppState) {
  return {
    workEntries: state.entries.length,
    cardLaunches: state.cartao?.lancamentos.length ?? 0,
    vehicles: state.taxVehicles?.length ?? 0,
    taxPayments: state.taxPayments?.length ?? 0,
  };
}
