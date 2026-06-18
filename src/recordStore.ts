// ============================================================================
// Record store — Floor 7 pilot Goal #6 ("Zero drill data in any real-incident
// FDNY submission, ever").
//
// Drill records and real-incident records are persisted under *separate*
// localStorage keys so the two sets can never bleed into one another. The FDNY
// report generator tags every saved record by the active mode (DRILL vs REAL),
// and the Command Deck can prove the isolation by showing the two counts.
// ============================================================================

export type RecordMode = "drill" | "real";

export interface MusterRecord {
  id: string;
  mode: RecordMode;
  createdAt: string; // ISO timestamp
  // Headline accountability numbers captured at report time.
  total: number;
  safe: number;
  missing: number;
  needHelp: number;
  critical: number;
  ledgerBlocks: number;
  ledgerVerified: boolean;
  // Full formatted FDNY/LL26 report text for re-export.
  report: string;
}

const KEYS: Record<RecordMode, string> = {
  drill: "mc_records_drill",
  real: "mc_records_real",
};

function read(mode: RecordMode): MusterRecord[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(KEYS[mode]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MusterRecord[]) : [];
  } catch {
    return [];
  }
}

function write(mode: RecordMode, records: MusterRecord[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(KEYS[mode], JSON.stringify(records));
  } catch {
    // Storage full / unavailable — fail quietly; the in-memory ledger is the
    // authoritative source during a live incident.
  }
}

/** Persist a record into the set matching its mode. Returns the saved record. */
export function saveRecord(
  mode: RecordMode,
  summary: Omit<MusterRecord, "id" | "mode" | "createdAt">,
): MusterRecord {
  const record: MusterRecord = {
    ...summary,
    id: `${mode}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mode,
    createdAt: new Date().toISOString(),
  };
  const existing = read(mode);
  write(mode, [record, ...existing]);
  return record;
}

/** Read every record for a given mode (most recent first). */
export function getRecords(mode: RecordMode): MusterRecord[] {
  return read(mode);
}

/** Current count of stored records in each isolated set. */
export function recordCounts(): { drill: number; real: number } {
  return { drill: read("drill").length, real: read("real").length };
}

/** Clear one record set (used by drill-close / reset flows). */
export function clearRecords(mode: RecordMode): void {
  write(mode, []);
}
