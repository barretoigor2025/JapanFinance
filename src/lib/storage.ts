import type { AppState } from '../types';
import { emptyState } from '../data/sampleBackup';
import { migrateBackup } from './backup';

const KEY = 'japanfinance:v1';

export function loadState(): AppState {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return emptyState;
    return migrateBackup(JSON.parse(saved));
  } catch (error) {
    console.warn('Falha ao carregar dados locais', error);
    return emptyState;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearLocalState() {
  localStorage.removeItem(KEY);
}
