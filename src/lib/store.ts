import { create } from 'zustand';
import type {
  AuditResult,
  Correction,
  Finding,
  AuditFindingInput,
} from '../types';

export interface AuditState {
  findings: Finding[];
  corrections: Record<string, Correction>;
  auditTimestamp: number | null;
  isAuditing: boolean;

  setFindings: (findings: AuditFindingInput[]) => void;
  addCorrections: (corrections: Record<string, Correction>) => void;
  updateCorrection: (findingId: string, correction: Partial<Correction> & { findingId: string }) => void;
  dismissFinding: (findingId: string, note?: string) => void;
  clearAudit: () => void;
  setAuditing: (isAuditing: boolean) => void;
  getAuditResult: () => AuditResult;
}

function applyCorrectionsToFindings(
  findings: Finding[],
  corrections: Record<string, Correction>,
): Finding[] {
  return findings.map((f) => {
    const correction = corrections[f.id];
    if (correction) {
      const status = correction.dismissed ? 'dismissed' as const : 'corrected' as const;
      return {
        ...f,
        status,
        humanNote: correction.note,
        humanSeverity: correction.severityOverride,
      };
    }
    return f;
  });
}

export const useAuditStore = create<AuditState>((set, get) => ({
  findings: [],
  corrections: {},
  auditTimestamp: null,
  isAuditing: false,

  setFindings: (newFindings) => {
    set((state) => {
      const mergedCorrections: Record<string, Correction> = {};
      Object.keys(state.corrections).forEach((id) => {
        if (newFindings.some((f) => f.id === id)) {
          mergedCorrections[id] = state.corrections[id];
        }
      });

      const updatedFindings: Finding[] = newFindings.map((f) => {
        const correction = mergedCorrections[f.id];
        if (correction) {
          const status = correction.dismissed ? 'dismissed' as const : 'corrected' as const;
          return { ...f, status, humanNote: correction.note, humanSeverity: correction.severityOverride };
        }
        return { ...f, status: 'pending' as const };
      });

      return {
        findings: updatedFindings,
        corrections: mergedCorrections,
        auditTimestamp: Date.now(),
        isAuditing: false,
      };
    });
  },

  addCorrections: (newCorrections) =>
    set((state) => {
      const merged = { ...state.corrections, ...newCorrections };
      return {
        corrections: merged,
        findings: applyCorrectionsToFindings(state.findings, merged),
      };
    }),

  updateCorrection: (findingId, correction) =>
    set((state) => {
      const updatedCorrections = {
        ...state.corrections,
        [findingId]: {
          ...state.corrections[findingId],
          ...correction,
          findingId,
        },
      };
      return {
        corrections: updatedCorrections,
        findings: applyCorrectionsToFindings(state.findings, updatedCorrections),
      };
    }),

  dismissFinding: (findingId, note = '') =>
    set((state) => {
      const updatedCorrections = {
        ...state.corrections,
        [findingId]: {
          findingId,
          dismissed: true,
          note,
        },
      };
      return {
        corrections: updatedCorrections,
        findings: applyCorrectionsToFindings(state.findings, updatedCorrections),
      };
    }),

  clearAudit: () =>
    set({
      findings: [],
      corrections: {},
      auditTimestamp: null,
      isAuditing: false,
    }),

  setAuditing: (isAuditing) => set({ isAuditing }),

  getAuditResult: () => {
    const state = get();
    return {
      findings: state.findings,
      corrections: state.corrections,
      summary: '',
      timestamp: state.auditTimestamp ?? Date.now(),
    };
  },
}));
