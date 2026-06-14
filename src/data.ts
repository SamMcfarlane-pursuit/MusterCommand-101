import { Occupant, LedgerBlock, Quadrant, OccupantStatus } from "./types";

// ============================================================================
// Floor 7 Pilot Roster — 4 Irving Plaza, ConEdison HQ
// Full daytime occupancy across 4 quadrants (Engineering, Comms & Gov Affairs, Legal, IT).
// KEY_OCCUPANTS holds 12 hand-authored personnel covering the scripted edge cases
// (F-89 FSD, F-58 Wardens, contractors, visitors, fall detection, ARA staging).
// A generated cohort then scales the roster to ~300 to validate high-density flows.
// ============================================================================

const KEY_OCCUPANTS: Occupant[] = [
  // F-89 Fire Safety Director — on-duty certified (NYC LL26 requirement)
  {
    id: "usr_d4e3f2a1",
    badgeId: "LS990011",
    nameEncrypted: "M••••• L••",
    role: "F-89 FSD",
    status: "ACCOUNTED",
    quadrant: "Center",
    staircase: "Stair A",
    musterZone: "Zone A",
    lastSeen: "10:00 AM",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: true
  },
  // F-58 Floor Fire Warden — NW Engineering (NYC LL26 per-floor requirement)
  {
    id: "usr_a7f8c9d1",
    badgeId: "NW449210",
    nameEncrypted: "J••• D••",
    role: "F-58 Warden",
    status: "ACCOUNTED",
    quadrant: "NW",
    staircase: "Stair A",
    musterZone: "Zone A",
    lastSeen: "10:02 AM",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: true
  },
  // F-58 Floor Fire Warden — SE IT Sector
  {
    id: "usr_g2h3i4j5",
    badgeId: "SE772211",
    nameEncrypted: "R•••• P•••••",
    role: "F-58 Warden",
    status: "MISSING",
    quadrant: "SE",
    lastSeen: "09:58 AM",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: true
  },
  // Standard Occupant — NE Legal
  {
    id: "usr_b3c7d6e5",
    badgeId: "HR551109",
    nameEncrypted: "A•••• S••••",
    role: "Occupant",
    status: "MEDICAL",
    quadrant: "NE",
    lastSeen: "10:04 AM",
    alertNote: "Fume inhalation near breakroom, requesting assistance with mobility.",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: true
  },
  // Standard Occupant — NW Engineering
  {
    id: "usr_c1b2a3d4",
    badgeId: "NW112233",
    nameEncrypted: "C••••• J••••••",
    role: "Occupant",
    status: "MISSING",
    quadrant: "NW",
    lastSeen: "09:58 AM",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: false  // OSHA 1910.38(e): Non-participant flagged
  },
  // Standard Occupant — Fall Detected (OSHA 1910.38(c)(1))
  {
    id: "usr_e5f6a7b8",
    badgeId: "FI338822",
    nameEncrypted: "D•••• M•••••",
    role: "Occupant",
    status: "MEDICAL",
    quadrant: "SE",
    lastSeen: "10:05 AM",
    alertNote: "On-device accelerometer triggered: fall detected near SE corridor.",
    fallDetected: true,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: true
  },
  // Contractor — HVAC (tracked separately per FDNY Fire Safety Plan)
  {
    id: "usr_f9e3c2b8",
    badgeId: "FA018239",
    nameEncrypted: "B•• J••••",
    role: "Contractor",
    status: "MISSING",
    quadrant: "Center",
    lastSeen: "09:55 AM",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: false  // Contractor did not check in — flagged
  },
  // Contractor — Electrical
  {
    id: "usr_h5i6j7k8",
    badgeId: "EL445566",
    nameEncrypted: "T•• R•••••••",
    role: "Contractor",
    status: "MISSING",
    quadrant: "NE",
    lastSeen: "09:50 AM",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: false
  },
  // Visitor — Signed in 10 minutes ago at lobby (highest accountability risk)
  {
    id: "usr_k9l0m1n2",
    badgeId: "VIS00101",
    nameEncrypted: "S••••• W••••",
    role: "Visitor",
    status: "MISSING",
    quadrant: "NW",
    lastSeen: "09:52 AM",
    alertNote: "Lobby sign-in 10 mins before alarm. No floor badge issued.",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: false
  },
  // Mobility-Impaired Occupant — staged at ARA NW (OSHA ARA tracking)
  {
    id: "usr_o3p4q5r6",
    badgeId: "NW889944",
    nameEncrypted: "E•••• C••••",
    role: "Occupant",
    status: "ARA_STAGING",
    quadrant: "NW",
    lastSeen: "10:03 AM",
    alertNote: "Wheelchair user staged at ARA NW. Awaiting FDNY-assisted evacuation.",
    fallDetected: false,
    mobilityImpaired: true,
    isAtARA: true,
    drillParticipant: true
  },
  // Mobility-Impaired Occupant — staged at ARA SE
  {
    id: "usr_s7t8u9v0",
    badgeId: "SE556677",
    nameEncrypted: "L••• T•••••",
    role: "Occupant",
    status: "ARA_STAGING",
    quadrant: "SE",
    lastSeen: "10:04 AM",
    alertNote: "Crutches. Staged at ARA SE. Requires stairchair for evacuation.",
    fallDetected: false,
    mobilityImpaired: true,
    isAtARA: true,
    drillParticipant: true
  },
  // Standard Occupant — SW Comms & Gov Affairs (already out for coffee)
  {
    id: "usr_w1x2y3z4",
    badgeId: "SW334455",
    nameEncrypted: "P••• G••••••",
    role: "Occupant",
    status: "MISSING",
    quadrant: "SW",
    lastSeen: "09:45 AM",
    alertNote: "Badged in but stepped out for coffee before alarm. Not on floor.",
    fallDetected: false,
    mobilityImpaired: false,
    isAtARA: false,
    drillParticipant: false
  }
];

// ============================================================================
// High-Density Roster Generator
// Fills the Floor 7 pilot to a realistic full-occupancy load (~300 people) so the
// FloorMap density visualization and FSD accountability flows can be validated at
// scale. The 12 hand-authored KEY_OCCUPANTS above carry the scripted edge cases;
// the generated cohort below provides representative volume per quadrant.
// ============================================================================

const FILLER_QUADRANTS: Quadrant[] = ["NW", "NE", "SW", "SE"];
const FILLER_INITIALS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "W"];

// Deterministic pseudo-random so the roster is stable across reloads.
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function generateRoster(count: number): Occupant[] {
  const rand = seededRandom(7);
  const roster: Occupant[] = [];
  for (let i = 0; i < count; i++) {
    const quadrant = FILLER_QUADRANTS[i % FILLER_QUADRANTS.length];
    const r = rand();
    // ~78% accounted, ~12% missing, ~6% ARA, ~4% medical
    const status: OccupantStatus =
      r < 0.78 ? "ACCOUNTED" : r < 0.90 ? "MISSING" : r < 0.96 ? "ARA_STAGING" : "MEDICAL";
    const mobilityImpaired = status === "ARA_STAGING";
    const fi = FILLER_INITIALS[Math.floor(rand() * FILLER_INITIALS.length)];
    const li = FILLER_INITIALS[Math.floor(rand() * FILLER_INITIALS.length)];
    const serial = String(100000 + i).slice(-6);
    roster.push({
      id: `usr_gen${serial}`,
      badgeId: `${quadrant}${serial}`,
      nameEncrypted: `${fi}••••• ${li}•••`,
      role: "Occupant",
      status,
      quadrant,
      staircase: quadrant === "NE" || quadrant === "SE" ? "Stair B" : "Stair A",
      musterZone: "Zone A",
      lastSeen: "10:0" + (i % 10) + " AM",
      fallDetected: false,
      mobilityImpaired,
      isAtARA: status === "ARA_STAGING",
      drillParticipant: status !== "MISSING"
    });
  }
  return roster;
}

// Combined full-occupancy roster: 12 scripted key personnel + ~288 generated.
export const INITIAL_OCCUPANTS: Occupant[] = [...KEY_OCCUPANTS, ...generateRoster(288)];

// Seed ledger blocks (Hash-Chained Ledger — OSHA 1910.38(c)(4) digital headcount)
export const SEED_LEDGER: LedgerBlock[] = [
  {
    index: 0,
    timestamp: "2026-05-28T10:00:00Z",
    event: "Alarm triggered on Floor 7 (Pilot Phase). Fire Command System online. F-89 FSD on station.",
    prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
    hash: "6e2e50550c6204b77f27af851532f83138b320876189daabc7cd23ebf90b0d62"
  },
  {
    index: 1,
    timestamp: "2026-05-28T10:02:15Z",
    event: "F-58 Warden usr_a7f8c9d1 scanned NFC badge at Stair A NFC gate: ACCOUNTED.",
    prevHash: "6e2e50550c6204b77f27af851532f83138b320876189daabc7cd23ebf90b0d62",
    hash: "f4007bbf519ff7f99ee70bfbdfce09f6eeb62f3a469446d376ca743ec9ef906a"
  },
  {
    index: 2,
    timestamp: "2026-05-28T10:03:10Z",
    event: "ARA_STAGING: Mobility-impaired occupant usr_o3p4q5r6 confirmed at ARA NW by F-58 Warden.",
    prevHash: "f4007bbf519ff7f99ee70bfbdfce09f6eeb62f3a469446d376ca743ec9ef906a",
    hash: "fbbf56edbcf52ae2e2764bbf63be1da4efba293818de77678ca902bcfaaeef90"
  },
  {
    index: 3,
    timestamp: "2026-05-28T10:04:10Z",
    event: "MEDICAL: Occupant usr_b3c7d6e5 reported fume inhalation near NE breakroom. Requesting assistance.",
    prevHash: "fbbf56edbcf52ae2e2764bbf63be1da4efba293818de77678ca902bcfaaeef90",
    hash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
  }
];

export const MUSTER_ZONES = [
  { id: "Zone A", label: "Zone A — Union Square Park", desc: "Primary Assembly Area [FDNY RECOMMENDED]" },
  { id: "Zone B", label: "Zone B — Irving Pl & 14th St", desc: "Secondary South Assembly" },
  { id: "Zone C", label: "Zone C — Irving Pl & 15th St", desc: "Tertiary North (Near FDNY Staging on E 15th)" }
];
