// ─── FILE: client/services/automationService.ts ─────────────────────────
// Full CRUD + live log streaming for automation rules

import apiClient from './apiClient';
import type { AutomationRule, AutomationLog, AutomationStats } from '../hooks/useAutomation';

export interface CreateRulePayload {
  type:        AutomationRule['type'];
  label:       string;
  description: string;
  enabled:     boolean;
  config:      Record<string, any>;
}

export const automationService = {
  // ─── Rules ───────────────────────────────────────────────
  getRules: (walletAddress: string) =>
    apiClient.get<AutomationRule[]>(`/automation/${walletAddress}/rules`),

  createRule: (walletAddress: string, payload: CreateRulePayload) =>
    apiClient.post<AutomationRule>(`/automation/${walletAddress}/rules`, payload),

  updateRule: (walletAddress: string, ruleId: string, config: Record<string, any>) =>
    apiClient.put<AutomationRule>(`/automation/${walletAddress}/rules/${ruleId}`, { config }),

  toggleRule: (walletAddress: string, ruleId: string, enabled: boolean) =>
    apiClient.patch<AutomationRule>(`/automation/${walletAddress}/rules/${ruleId}`, { enabled }),

  deleteRule: (walletAddress: string, ruleId: string) =>
    apiClient.delete(`/automation/${walletAddress}/rules/${ruleId}`),

  // ─── Logs ────────────────────────────────────────────────
  getLogs: (walletAddress: string, limit = 50) =>
    apiClient.get<AutomationLog[]>(`/automation/${walletAddress}/logs`, { limit }),

  subscribeLogs: (
    walletAddress: string,
    onLog: (log: AutomationLog) => void,
    onError?: (err: Event) => void
  ): (() => void) => {
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
    const source = new EventSource(`${base}/automation/${walletAddress}/logs/stream`);

    source.onmessage = (e) => {
      try { onLog(JSON.parse(e.data)); } catch { /* ignore malformed events */ }
    };

    if (onError) source.onerror = onError;

    return () => source.close();
  },

  // ─── Stats ──────────────────────────────────────────────
  getStats: (walletAddress: string) =>
    apiClient.get<AutomationStats>(`/automation/${walletAddress}/stats`),
};

export default automationService;
