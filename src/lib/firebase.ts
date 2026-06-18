import type { AppState } from '../types';

// Firebase é opcional. O app funciona 100% offline/localStorage.
// Para ativar nuvem: crie .env.local com VITE_FIREBASE_* e conecte aqui.
export const firebaseEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

export const firebaseEnabled = Boolean(firebaseEnv.apiKey && firebaseEnv.authDomain && firebaseEnv.projectId);

export async function syncToFirebase(_state: AppState) {
  if (!firebaseEnabled) throw new Error('Firebase ainda não configurado. Use backup JSON por enquanto.');
  // Próximo passo: Auth anônima + Firestore por usuário + snapshots versionados.
  throw new Error('Sincronização Firebase será ligada após configurar o projeto Firebase.');
}
