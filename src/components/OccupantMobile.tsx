import React, { useState } from "react";
import { z } from "zod";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Wifi,
  Flame,
  RotateCcw,
  QrCode,
  ScanLine,
  AlertOctagon,
  MapPin,
  Send,
} from "lucide-react";
import { Occupant } from "../types";
import { sanitizeText, validateBadgeSyntax } from "../utils";

// Schema for input evaluation complying with Level 1 validation
const alertFormSchema = z.object({
  badgeId: z.string().refine((val) => validateBadgeSyntax(val), {
    message:
      "Invalid format. Must be 2 uppercase letters followed by 6 numbers (e.g., NW112233).",
  }),
  note: z.string().max(200, "Notes cannot exceed 200 characters."),
});

// Each muster point maps to its optimal egress staircase so the occupant gets
// routed the right way the moment they pick an assembly zone.
const ZONE_STAIR: Record<
  string,
  { stair: "Stair A" | "Stair C"; label: string; desc: string }
> = {
  "Zone A": {
    stair: "Stair A",
    label: "Stair A (North)",
    desc: "Primary egress — exits toward Union Square Park.",
  },
  "Zone B": {
    stair: "Stair C",
    label: "Stair C (East)",
    desc: "Secondary egress — exits toward East 14th St.",
  },
  "Zone C": {
    stair: "Stair A",
    label: "Stair A (North)",
    desc: "Exits toward 15th St North, nearest FDNY staging.",
  },
};

interface OccupantMobileProps {
  occupant: Occupant;
  isBlackout: boolean;
  onUpdateStatus: (
    id: string,
    status: Occupant["status"],
    zone?: string,
    note?: string,
    fallDetected?: boolean,
  ) => void;
  stairBBlocked: boolean;
  activeDirective: string;
}

// Deterministic QR code matrix generator for high-fidelity offline verification simulation
const generateQRMatrix = (payload: string): boolean[][] => {
  const size = 16;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  // Deterministic seed from payload string
  let seed = 0;
  for (let i = 0; i < payload.length; i++) {
    seed = (seed << 5) - seed + payload.charCodeAt(i);
    seed |= 0; // Convert to 32bit integer
  }

  // Simple pseudo-random generator from seed
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x) > 0.5;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Top-left finder pattern (4x4)
      if (r < 4 && c < 4) {
        matrix[r][c] =
          r === 0 ||
          r === 3 ||
          c === 0 ||
          c === 3 ||
          (r === 1 && c === 1) ||
          (r === 1 && c === 2) ||
          (r === 2 && c === 1) ||
          (r === 2 && c === 2);
        continue;
      }
      // Top-right finder pattern
      if (r < 4 && c >= size - 4) {
        const mc = c - (size - 4);
        matrix[r][c] =
          r === 0 ||
          r === 3 ||
          mc === 0 ||
          mc === 3 ||
          (r === 1 && mc === 1) ||
          (r === 1 && mc === 2) ||
          (r === 2 && mc === 1) ||
          (r === 2 && mc === 2);
        continue;
      }
      // Bottom-left finder pattern
      if (r >= size - 4 && c < 4) {
        const mr = r - (size - 4);
        matrix[r][c] =
          mr === 0 ||
          mr === 3 ||
          c === 0 ||
          c === 3 ||
          (mr === 1 && c === 1) ||
          (mr === 1 && c === 2) ||
          (mr === 2 && c === 1) ||
          (mr === 2 && c === 2);
        continue;
      }

      // Timing pattern (vertical and horizontal dashed lines)
      if (r === 5 || c === 5) {
        matrix[r][c] = (r + c) % 2 === 0;
        continue;
      }

      // Fill rest pseudo-randomly
      matrix[r][c] = random();
    }
  }

  // Ensure central finders are aligned correctly
  return matrix;
};

export default function OccupantMobile({
  occupant,
  isBlackout,
  onUpdateStatus,
  stairBBlocked,
  activeDirective,
}: OccupantMobileProps) {
  const [activeScreen, setActiveScreen] = useState<"FORM" | "QR_PASS">("FORM");
  const [badgeInput, setBadgeInput] = useState("");
  const [alertNote, setAlertNote] = useState("");
  const [selectedZone, setSelectedZone] = useState("Zone A");
  const [isFallSensorEnabled, setIsFallSensorEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Send the typed message to Command without changing the occupant's status.
  const sendNote = () => {
    // Zod Level-1 validation (note length + badge format if one was typed).
    const result = alertFormSchema.safeParse({
      badgeId: badgeInput.toUpperCase().trim() || occupant.badgeId,
      note: alertNote,
    });
    if (!result.success) {
      setValidationError(result.error.issues[0].message);
      return;
    }

    const safe = sanitizeText(alertNote).trim();
    if (!safe) {
      setValidationError("Type a message first, then send it to Command.");
      return;
    }
    setValidationError(null);
    onUpdateStatus(
      occupant.id,
      occupant.status,
      occupant.mobilityImpaired ? undefined : selectedZone,
      safe,
      isFallSensorEnabled,
    );
    setStatusMessage(
      "Message sent to Command — visible on the Life-Safety log.",
    );
  };

  const toggleFallSensor = () => {
    const newVal = !isFallSensorEnabled;
    setIsFallSensorEnabled(newVal);

    // Automatically trigger CRITICAL status on fall sensors
    if (newVal) {
      onUpdateStatus(
        occupant.id,
        "MEDICAL",
        selectedZone,
        "Automatic Fall Sensor Alarm triggered (OSHA 1910.38(c)(1)).",
        true,
      );
      setStatusMessage("Critical telemetry sent: Fall coordinates compiled.");
    } else {
      onUpdateStatus(occupant.id, "ACCOUNTED", selectedZone, undefined, false);
      setStatusMessage("Fall status reset safe.");
    }
  };

  // Generate dynamic payload for current check-in state
  const qrPayload = `TOKEN:${occupant.id}|STATUS:${occupant.status}|ZONE:${selectedZone}|BADGE:${badgeInput || occupant.badgeId}|SEC:${isBlackout ? "MESH_HMAC" : "TLS_1.3"}`;
  const qrGrid = generateQRMatrix(qrPayload);

  return (
    <div className="w-full max-w-sm mx-auto bg-gray-950 rounded-[40px] border-8 border-gray-800 p-4 shadow-2xl relative overflow-hidden flex flex-col h-[710px]">
      {/* Phone Camera Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-gray-800 rounded-b-2xl z-20 flex items-center justify-center">
        <div className="w-12 h-1 bg-gray-900 rounded-full" />
      </div>

      {/* Screen Header Status Bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 pt-1 px-2 mb-3 select-none">
        <span className="font-bold text-slate-300">🛡️ MusterCommand</span>
        <div className="flex items-center gap-1.5">
          {isBlackout ? (
            <span className="text-yellow-500 font-bold animate-pulse flex items-center gap-0.5">
              <span>● OFFLINE</span>
            </span>
          ) : (
            <span className="text-emerald-500 flex items-center gap-0.5">
              <Wifi size={10} /> ONLINE
            </span>
          )}
        </div>
      </div>

      {/* Current Status Banner */}
      <div
        className={`mb-4 p-4 rounded-2xl text-center transition-all ${
          occupant.status === "ACCOUNTED"
            ? "bg-emerald-950/60 border-2 border-emerald-500"
            : occupant.status === "MEDICAL"
              ? "bg-red-950/60 border-2 border-red-500 animate-pulse"
              : occupant.status === "ARA_STAGING"
                ? "bg-blue-950/60 border-2 border-blue-500"
                : "bg-amber-950/60 border-2 border-amber-500"
        }`}
      >
        <div className="text-[10px] uppercase font-mono tracking-widest text-gray-400 mb-1">
          Your Status
        </div>
        <div
          className={`text-2xl font-black uppercase tracking-wide ${
            occupant.status === "ACCOUNTED"
              ? "text-emerald-400"
              : occupant.status === "MEDICAL"
                ? "text-red-400"
                : occupant.status === "ARA_STAGING"
                  ? "text-blue-400"
                  : "text-amber-400"
          }`}
        >
          {occupant.status === "ACCOUNTED"
            ? "✓ SAFE"
            : occupant.status === "MEDICAL"
              ? "⚠ MEDICAL"
              : occupant.status === "ARA_STAGING"
                ? "⏳ AWAITING HELP"
                : "⚠ NOT CHECKED IN"}
        </div>
        {occupant.status === "ACCOUNTED" && (
          <div className="text-[10px] text-emerald-300 mt-1">
            You are safe at {occupant.musterZone || "muster point"}
          </div>
        )}
      </div>

      {/* Active FSD Evacuation Directive (broadcast from Command Deck) */}
      <div className="mb-3 bg-amber-950/30 border border-amber-800/50 rounded-2xl p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame size={11} className="text-amber-500 animate-pulse" />
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-500">
            Evacuation Order
          </span>
        </div>
        <p className="text-[11px] text-amber-100 leading-snug">
          {activeDirective}
        </p>
        {stairBBlocked && (
          <p className="text-[10px] text-red-300 font-bold mt-1.5 flex items-center gap-1">
            <AlertTriangle size={10} className="shrink-0" /> Stair C is BLOCKED
            — evacuate via Stair A.
          </p>
        )}
      </div>

      {/* Core Screen Space - Simplified Flow */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 px-1 text-gray-200">
        {/* PRIMARY ACTION BUTTONS - Always Visible */}
        <div className="space-y-3">
          {/* 1. EMERGENCY PANIC BUTTON - Top Priority */}
          <button
            type="button"
            onClick={() => {
              onUpdateStatus(
                occupant.id,
                "MEDICAL",
                undefined,
                "🚨 EMERGENCY SOS - Immediate assistance required!",
                isFallSensorEnabled,
              );
              setStatusMessage("🚨 SOS ALERT SENT! Help is on the way.");
            }}
            className="w-full py-8 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-3xl shadow-[0_8px_30px_rgba(239,68,68,0.4)] border-4 border-red-400 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-3 text-white cursor-pointer"
          >
            <AlertOctagon size={56} className="animate-pulse drop-shadow-lg" />
            <div className="text-center">
              <div className="text-3xl font-black tracking-wider">
                EMERGENCY
              </div>
              <div className="text-lg font-bold opacity-90 mt-1">
                Press if in danger
              </div>
            </div>
          </button>

          {/* Screen Toggle: Check-In actions vs Muster QR Pass */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-900/80 border border-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveScreen("FORM")}
              className={`py-2 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeScreen === "FORM"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <CheckCircle size={13} /> Check In
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen("QR_PASS")}
              className={`py-2 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeScreen === "QR_PASS"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <QrCode size={13} /> My QR Pass
            </button>
          </div>

          {/* Check-in actions (FORM screen only) */}
          {activeScreen === "FORM" && (
            <>
              {/* 2. I'M SAFE Button - Primary Check-In */}
              {occupant.status !== "ACCOUNTED" ? (
                <button
                  type="button"
                  onClick={() => {
                    const safe = sanitizeText(alertNote).trim();
                    onUpdateStatus(
                      occupant.id,
                      "ACCOUNTED",
                      selectedZone,
                      safe
                        ? `Safe check-in — ${safe}`
                        : "Safe check-in via mobile app",
                      false,
                    );
                    setStatusMessage("✅ You are marked SAFE!");
                  }}
                  className="w-full py-6 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-2xl shadow-[0_6px_20px_rgba(16,185,129,0.3)] border-2 border-emerald-400 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-white cursor-pointer"
                >
                  <CheckCircle size={40} />
                  <div className="text-center">
                    <div className="text-2xl font-black">I'M SAFE</div>
                    <div className="text-sm opacity-90">Tap to check in</div>
                  </div>
                </button>
              ) : (
                <div className="w-full py-6 bg-emerald-950/40 border-2 border-emerald-600 rounded-2xl flex items-center justify-center gap-3 text-emerald-400">
                  <CheckCircle size={40} />
                  <div className="text-center">
                    <div className="text-2xl font-black">CHECKED IN ✓</div>
                    <div className="text-sm">
                      You are safe at {occupant.musterZone || "muster point"}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ARA Request for Mobility Impaired (Conditional) */}
              {occupant.mobilityImpaired &&
                occupant.status !== "ARA_STAGING" && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStatus(
                        occupant.id,
                        "ARA_STAGING",
                        undefined,
                        "♿ Requesting evacuation assistance at ARA",
                        false,
                      );
                      setStatusMessage(
                        "ARA assistance requested. Warden notified.",
                      );
                    }}
                    className="w-full py-5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-2xl shadow-lg border-2 border-blue-400 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-white cursor-pointer"
                  >
                    <MapPin size={32} />
                    <div className="text-center">
                      <div className="text-xl font-black">
                        ♿ NEED ASSISTANCE
                      </div>
                      <div className="text-sm opacity-90">
                        Request help at ARA
                      </div>
                    </div>
                  </button>
                )}

              {/* 4. I Need Medical Help (Alternative to Panic) */}
              {occupant.status !== "MEDICAL" &&
                occupant.status !== "ARA_STAGING" && (
                  <button
                    type="button"
                    onClick={() => {
                      const safe = sanitizeText(alertNote).trim();
                      onUpdateStatus(
                        occupant.id,
                        "MEDICAL",
                        selectedZone,
                        safe || "Medical assistance needed",
                        false,
                      );
                      setStatusMessage("Medical alert sent to wardens.");
                    }}
                    className="w-full py-4 bg-orange-700 hover:bg-orange-600 rounded-xl border border-orange-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white cursor-pointer"
                  >
                    <Activity size={24} />
                    <span className="text-lg font-bold">
                      I Need Medical Help
                    </span>
                  </button>
                )}
            </>
          )}
        </div>

        {/* DIVIDER */}
        {activeScreen === "FORM" && (
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[10px] text-gray-600 uppercase font-mono">
              Additional Info (Optional)
            </span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
        )}

        {activeScreen === "FORM" ? (
          <>
            {/* Optional Details Section */}
            <div className="bg-gray-900/40 rounded-xl border border-gray-800/80 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Optional Details
              </h4>

              {/* Badge ID */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase mb-1.5 font-mono">
                  Badge ID
                </label>
                <input
                  type="text"
                  placeholder={occupant.badgeId}
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value.toUpperCase())}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase mb-1.5 font-mono">
                  Notes
                </label>
                <textarea
                  placeholder="Any concerns, injuries, or information..."
                  value={alertNote}
                  onChange={(e) => setAlertNote(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white h-20 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <button
                  type="button"
                  onClick={sendNote}
                  className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg border border-amber-400/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  <Send size={16} />
                  Send Message to Command
                </button>
                <p className="text-[9px] text-gray-500 mt-1.5 leading-tight">
                  Your message appears instantly on the Command Life-Safety log
                  so a warden or FSD can attend to it.
                </p>
              </div>
            </div>

            {/* Assembly Zone Selector */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase mb-1.5 font-mono">
                Muster Point
              </label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Zone A">Zone A - Union Square Park ⭐</option>
                <option value="Zone B">Zone B - 14th St South</option>
                <option value="Zone C">Zone C - 15th St North</option>
              </select>

              {/* Recommended egress staircase for the selected muster point */}
              {ZONE_STAIR[selectedZone] &&
                (() => {
                  const route = ZONE_STAIR[selectedZone];
                  const blocked = route.stair === "Stair C" && stairBBlocked;
                  return (
                    <div
                      className={`mt-2 rounded-lg border p-2.5 ${
                        blocked
                          ? "bg-red-950/40 border-red-700/70"
                          : "bg-emerald-950/30 border-emerald-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin
                          size={13}
                          className={
                            blocked ? "text-red-400" : "text-emerald-400"
                          }
                        />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                          Use
                        </span>
                        <span
                          className={`text-sm font-black ${
                            blocked ? "text-red-300" : "text-emerald-300"
                          }`}
                        >
                          {blocked ? "Stair A (North)" : route.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                        {blocked
                          ? "⚠ Stair C is BLOCKED — reroute to Stair A (North) immediately."
                          : route.desc}
                      </p>
                    </div>
                  );
                })()}
            </div>

            {/* Fall Sensor Simulator (OSHA Compliance) */}
            <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase font-bold">
                  OSHA On-Device Telemetry
                </span>
                <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 py-0.2 rounded font-mono uppercase">
                  OSHA 1910.38
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 p-2 bg-gray-950 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                  <Activity
                    className={`${isFallSensorEnabled ? "text-red-500 animate-pulse" : "text-emerald-500"}`}
                    size={16}
                  />
                  <div>
                    <span className="text-[10px] block text-gray-400 font-mono">
                      Tilt / Accel Sensor
                    </span>
                    <span className="text-sm font-bold font-mono text-gray-200">
                      {isFallSensorEnabled
                        ? "0.1G / IMPACT ALERT"
                        : "1.0G (STABLE)"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    Simulate Fall
                  </span>
                  <button
                    onClick={toggleFallSensor}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      isFallSensorEnabled ? "bg-red-500" : "bg-gray-800"
                    }`}
                    id="btn-simulate-fall"
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        isFallSensorEnabled ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* MUSTER QR PASS VIEW SCREEN */
          <div className="bg-gray-900/60 p-4 border border-slate-800 rounded-2xl flex flex-col items-center space-y-3.5 animate-fadeIn">
            <div className="text-center">
              <span className="text-[9px] font-mono bg-amber-950 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                Muster Station Terminal Ticket
              </span>
              <p className="text-[9px] text-gray-400 mt-1 leading-normal max-w-xs font-mono">
                Present this cryptographically tagged ticket to an active FDNY
                Warden tablet or kiosk scanner point.
              </p>
            </div>

            {/* Beautiful QR Code Matrix with Scanner animation */}
            <div className="relative p-3.5 bg-white rounded-2xl shadow-inner border-4 border-slate-750 flex flex-col items-center justify-center">
              {/* Dynamic QR Pixel Grid */}
              <div className="grid grid-cols-16 gap-[1.5px] bg-white p-1">
                {qrGrid.map((row, rIdx) =>
                  row.map((active, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`w-[11.5px] h-[11.5px] rounded-[1px] transition-colors duration-300 ${
                        active
                          ? occupant.status === "ACCOUNTED"
                            ? "bg-slate-950"
                            : occupant.status === "MEDICAL"
                              ? "bg-red-950"
                              : "bg-amber-950"
                          : "bg-white"
                      }`}
                    />
                  )),
                )}
              </div>

              {/* Animated Glowing Scan Line */}
              <div
                className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"
                style={{ animationDuration: "1.8s" }}
              />

              <div className="absolute top-1 right-1">
                <ScanLine size={14} className="text-slate-400 opacity-60" />
              </div>
            </div>

            {/* Sync ticket status information details card */}
            <div className="w-full bg-black/60 rounded-xl p-2.5 border border-slate-800 text-[10px] space-y-1.5 font-mono">
              <div className="flex justify-between border-b border-slate-850 pb-1 text-slate-400 font-bold">
                <span>ENTRY PARAMETER</span>
                <span className="text-slate-100">SEALED ENVELOPE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Occupant Token:</span>
                <span className="text-yellow-400 font-bold">{occupant.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned Zone:</span>
                <span className="text-slate-205 font-bold">{selectedZone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verification Code:</span>
                <span className="text-slate-205">
                  {badgeInput || occupant.badgeId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Status:</span>
                <span
                  className={`font-bold uppercase ${
                    occupant.status === "ACCOUNTED"
                      ? "text-emerald-400"
                      : occupant.status === "MEDICAL"
                        ? "text-red-400 animate-pulse"
                        : occupant.status === "ARA_STAGING"
                          ? "text-blue-400"
                          : "text-amber-400"
                  }`}
                >
                  {occupant.status}
                </span>
              </div>

              {/* Encrypted JSON Payload hash for Section 5 compliance */}
              <div className="pt-1.5 border-t border-slate-850">
                <span className="text-[7.5px] uppercase tracking-wider text-slate-500 block mb-0.5">
                  Sealed SHA-256 HMAC Stamp:
                </span>
                <p className="text-[8px] text-slate-400 leading-tight select-all break-all overflow-hidden line-clamp-2 select-all whitespace-pre-wrap bg-slate-950 p-1 rounded font-mono border border-slate-900">
                  {qrPayload}
                </p>
              </div>
            </div>

            {/* Scan the pass to sign in at the muster gate */}
            <button
              onClick={() => {
                const safe = sanitizeText(alertNote).trim();
                onUpdateStatus(
                  occupant.id,
                  "ACCOUNTED",
                  selectedZone,
                  safe
                    ? `QR muster sign-in at ${selectedZone} — ${safe}`
                    : `QR muster sign-in at ${selectedZone}`,
                  false,
                );
                setStatusMessage(
                  `✅ Signed in via QR at Muster Gate ${selectedZone}. You are ACCOUNTED.`,
                );
                setActiveScreen("FORM");
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-sm py-3 border border-emerald-400/40 rounded-xl transition-all tracking-wide active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <QrCode size={16} />
              Scan &amp; Sign In at Muster Gate
            </button>
            <p className="text-[9px] text-gray-500 text-center leading-tight">
              A warden can also scan this pass from their tablet to sign you in.
            </p>
          </div>
        )}
      </div>

      {/* Touch Screen Validation Errors */}
      {validationError && (
        <div className="bg-red-950/80 border border-red-500/70 p-2 rounded-xl text-red-200 text-[10px] font-mono mb-2 flex items-center gap-1">
          <AlertTriangle size={12} className="shrink-0 text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Screen Success Confirmation */}
      {statusMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/70 p-2 rounded-xl text-emerald-200 text-[9px] font-mono mb-2 leading-tight">
          <div className="flex items-center gap-1 font-bold text-emerald-300">
            <CheckCircle size={10} /> Sync Complete
          </div>
          <span className="block mt-0.5 text-slate-350">{statusMessage}</span>
        </div>
      )}

      {/* Spacer */}
      <div className="mt-auto" />

      {/* Phone Home Button bar */}
      <div className="w-full flex justify-center py-1 bg-transparent mt-1">
        <div className="w-28 h-1 bg-gray-800 rounded-full" />
      </div>
    </div>
  );
}
