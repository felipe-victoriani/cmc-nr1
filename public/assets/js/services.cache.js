// ============================================================
// services.cache.js — Cache em memória com TTL
//
// Evita chamadas repetidas ao Firebase para dados de referência
// que raramente mudam durante uma sessão (estabelecimentos,
// setores, cargos, empresas). O cache vive apenas na aba atual
// e é automaticamente descartado ao fechar/recarregar a página.
//
// TTL padrão: 5 minutos. Dados transacionais (trabalhadores,
// riscos, planos de ação, etc.) NÃO devem usar este cache.
// ============================================================

const _store = new Map(); // chave → { data, expiresAt }

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Retorna o dado em cache para `key`, ou null se expirado/ausente.
 */
export function cacheGet(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Armazena `data` em cache sob `key` com TTL em milissegundos.
 */
export function cacheSet(key, data, ttlMs = DEFAULT_TTL_MS) {
  _store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Remove uma entrada específica do cache.
 * Chame após operações de escrita para forçar refetch.
 */
export function cacheInvalidate(key) {
  _store.delete(key);
}

/**
 * Remove todas as entradas cujo prefixo de chave começa com `prefix`.
 * Útil para invalidar todas as variações de um recurso.
 * Exemplo: cacheInvalidatePrefix("establishments:") remove
 * "establishments:all", "establishments:companyXYZ", etc.
 */
export function cacheInvalidatePrefix(prefix) {
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) _store.delete(key);
  }
}

/**
 * Limpa todo o cache — útil após logout ou troca de empresa.
 */
export function cacheClear() {
  _store.clear();
}
