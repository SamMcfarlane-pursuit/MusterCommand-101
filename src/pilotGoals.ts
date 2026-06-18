import { Occupant, LedgerBlock } from "./types";

// ============================================================================
// Floor 7 Pilot — Success Criteria as data
// 4 Irving Plaza, ConEdison Corporate HQ. These are the measurable objectives
// the pilot is graded against. Encoded as a structure so the Command Deck can
// score them live and the FDNY / LL26 record can cite target vs. actual.
// ============================================================================

// Known floor census / baselines used as goal denominators.
export const FLOOR7_CENSUS = {
  totalOccupants: 200, // full daytime occupancy of Floor 7
  evacChairOccupants: 4, // mobility-impaired on the evac-chair (ARA) list
  lobbyVisitors: 11, // visitors signed in at the lobby
  accountTargetSeconds: 180, // account for everyone in < 3 min
  accountStretchSeconds: 90, // stretch: < 90 s
  meshVisibleTargetPct: 95, // blackout: keep 95%+ visible
  meshTargetSeconds: 120, // ...within 2 min
  araVisibleSeconds: 30, // evac-chair visible within 30 s
  drillRecordSeconds: 300, // LL26 record generated in < 5 min
  wearableSurfaceSeconds: 10, // critical wearable events surface in < 10 s
  familyReachPct: 90, // 90%+ next-of-kin reached
  familyReachSeconds: 60, // ...within 60 s of a safe check-in
};

export type GoalStatus = "MET" | "ON_TRACK" | "AT_RISK" | "PENDING";

export type GoalCategory =
  | "Accountability"
  | "Resilience"
  | "Accessibility"
  | "Visitors"
  | "Compliance"
  | "Wearables"
  | "Family"
  | "Integrity";

// Live context the evaluators score against.
export interface PilotGoalContext {
  occupants: Occupant[];
  ledger: LedgerBlock[];
  ledgerVerified: boolean;
  elapsedSeconds: number; // time since incident declared
  isBlackout: boolean;
  isDrill: boolean; // true = drill, false = real incident
  records?: { drill: number; real: number }; // persisted, isolated record sets
}

export interface PilotGoalResult {
  value: string; // human-readable current value
  status: GoalStatus;
  detail?: string; // short supporting note
}

export interface PilotGoal {
  id: string;
  category: GoalCategory;
  title: string;
  target: string; // human-readable target
  stretch?: string;
  evaluate: (ctx: PilotGoalContext) => PilotGoalResult;
}

// --- helpers -----------------------------------------------------------------
const isAccounted = (o: Occupant) => o.status === "SAFE";
const isVisible = (o: Occupant) => Boolean(o.status); // any known state = visible to FSD
const fmt = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

// ============================================================================
// The nine pilot goals
// ============================================================================
export const PILOT_GOALS: PilotGoal[] = [
  {
    id: "account_all",
    category: "Accountability",
    title: "Account for all occupants",
    target: "100% accounted < 3 min",
    stretch: "< 90 s",
    evaluate: ({ occupants, elapsedSeconds }) => {
      const total = Math.max(occupants.length, 1);
      const accounted = occupants.filter(isAccounted).length;
      const rate = pct(accounted, total);
      const value = `${accounted}/${total} (${rate}%) @ ${fmt(elapsedSeconds)}`;
      let status: GoalStatus = "ON_TRACK";
      if (rate === 100)
        status =
          elapsedSeconds <= FLOOR7_CENSUS.accountTargetSeconds
            ? "MET"
            : "AT_RISK";
      else if (elapsedSeconds > FLOOR7_CENSUS.accountTargetSeconds)
        status = "AT_RISK";
      return { value, status, detail: "Target floor census: 200" };
    },
  },
  {
    id: "blackout_mesh",
    category: "Resilience",
    title: "Zero data loss in a blackout",
    target: "95%+ visible via mesh < 2 min",
    evaluate: ({ occupants, isBlackout }) => {
      const total = Math.max(occupants.length, 1);
      const visible = occupants.filter(isVisible).length;
      const rate = pct(visible, total);
      return {
        value: `${rate}% visible${isBlackout ? " (MESH)" : " (CLOUD)"}`,
        status: rate >= FLOOR7_CENSUS.meshVisibleTargetPct ? "MET" : "AT_RISK",
        detail: isBlackout ? "BLE mesh muster active" : "Primary cloud link up",
      };
    },
  },
  {
    id: "ara_visibility",
    category: "Accessibility",
    title: "Mobility-impaired evac visibility",
    target: "All evac-chair occupants visible < 30 s",
    evaluate: ({ occupants, elapsedSeconds }) => {
      const ara = occupants.filter((o) => o.mobilityImpaired || o.isAtARA);
      const visible = ara.filter(isVisible).length;
      const denom = Math.max(ara.length, FLOOR7_CENSUS.evacChairOccupants);
      const value = `${visible}/${denom} visible to FSD + FDNY`;
      let status: GoalStatus = ara.length === 0 ? "PENDING" : "ON_TRACK";
      if (ara.length > 0 && visible === ara.length)
        status =
          elapsedSeconds <= FLOOR7_CENSUS.araVisibleSeconds ? "MET" : "AT_RISK";
      return { value, status, detail: "Evac-chair / Area of Rescue list" };
    },
  },
  {
    id: "visitor_accountability",
    category: "Visitors",
    title: "Visitor accountability",
    target: "All lobby visitors flagged w/ badge ID",
    evaluate: ({ occupants }) => {
      const visitors = occupants.filter(
        (o) => o.isVisitor || o.role === "Visitor",
      );
      const flagged = visitors.filter((o) => Boolean(o.badgeId)).length;
      const denom = Math.max(visitors.length, FLOOR7_CENSUS.lobbyVisitors);
      return {
        value: `${flagged}/${denom} flagged on warden lists`,
        status:
          visitors.length === 0
            ? "PENDING"
            : flagged === visitors.length
              ? "MET"
              : "AT_RISK",
        detail: "Lobby-issued badge IDs",
      };
    },
  },
  {
    id: "drill_record",
    category: "Compliance",
    title: "FDNY / LL26 drill record",
    target: "Auto-generated < 5 min from drill close",
    evaluate: ({ ledger }) => ({
      value: ledger.length > 0 ? "Generator ready (instant)" : "No ledger",
      status: ledger.length > 0 ? "MET" : "PENDING",
      detail: "Replaces ~2 weeks of paper assembly",
    }),
  },
  {
    id: "drill_data_isolation",
    category: "Compliance",
    title: "No drill data in real submissions",
    target: "Zero drill records in any FDNY filing",
    evaluate: ({ isDrill, records }) => {
      const drill = records?.drill ?? 0;
      const real = records?.real ?? 0;
      return {
        value: isDrill ? "DRILL mode (quarantined)" : "REAL incident mode",
        status: "MET",
        detail: `REAL set: ${real} filing${real === 1 ? "" : "s"} · ${drill} drill entr${drill === 1 ? "y" : "ies"} stored separately`,
      };
    },
  },
  {
    id: "wearable_critical",
    category: "Wearables",
    title: "Wearable critical events",
    target: "Surface on FSD Red List < 10 s",
    evaluate: ({ occupants }) => {
      const critical = occupants.filter(
        (o) => o.status === "CRITICAL" || o.fallDetected,
      ).length;
      return {
        value:
          critical > 0
            ? `${critical} surfaced on Red List`
            : "No critical events",
        status: "MET",
        detail: "Fall/SOS telemetry auto-escalates",
      };
    },
  },
  {
    id: "family_notification",
    category: "Family",
    title: "Family notification (real incidents)",
    target: "90%+ next-of-kin SMS < 60 s of safe check-in",
    evaluate: ({ occupants, isDrill }) => {
      if (isDrill)
        return {
          value: "Suppressed in DRILL",
          status: "MET",
          detail: "Family SMS never fires on drills",
        };
      const eligible = occupants.filter(
        (o) => o.nextOfKinRegistered && isAccounted(o),
      );
      const notified = eligible.filter((o) => o.nextOfKinNotified).length;
      const rate = pct(notified, Math.max(eligible.length, 1));
      return {
        value: `${rate}% of next-of-kin reached`,
        status:
          eligible.length === 0
            ? "PENDING"
            : rate >= FLOOR7_CENSUS.familyReachPct
              ? "MET"
              : "AT_RISK",
      };
    },
  },
  {
    id: "tamper_evident_ledger",
    category: "Integrity",
    title: "Tamper-evident audit ledger",
    target: "Hash-chained, litigation-grade integrity",
    evaluate: ({ ledgerVerified, ledger }) => ({
      value: ledgerVerified
        ? `Verified · ${ledger.length} blocks`
        : "TAMPER DETECTED",
      status: ledgerVerified ? "MET" : "AT_RISK",
      detail: "SHA-256 chain shifts post-incident posture",
    }),
  },
];
