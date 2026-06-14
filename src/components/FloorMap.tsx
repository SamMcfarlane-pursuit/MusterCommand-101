import React, { useState } from "react";
import { Occupant } from "../types";
import { Users, MapPin, Activity } from "lucide-react";

interface FloorMapProps {
  occupants: Occupant[];
  stairBBlocked: boolean;
  onToggleStairB: () => void;
  onOccupantClick?: (occupant: Occupant) => void;
  selectedQuadrant?: string | null;
  onQuadrantClick?: (quadrant: string) => void;
}

export default function FloorMap({
  occupants,
  stairBBlocked,
  onToggleStairB,
  onOccupantClick,
  selectedQuadrant,
  onQuadrantClick
}: FloorMapProps) {
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"MAP" | "LIST">("MAP");

  const quadrants = ["NW", "NE", "SW", "SE"];

  const getQuadrantOccupants = (quadrant: string) => {
    return occupants.filter(o => o.quadrant === quadrant);
  };

  const getQuadrantStats = (quadrant: string) => {
    const quadOccupants = getQuadrantOccupants(quadrant);
    const accounted = quadOccupants.filter(o => o.status === "ACCOUNTED").length;
    const medical = quadOccupants.filter(o => o.status === "MEDICAL").length;
    const ara = quadOccupants.filter(o => o.status === "ARA_STAGING").length;
    const missing = quadOccupants.filter(o => o.status === "MISSING").length;
    return { total: quadOccupants.length, accounted, medical, ara, missing };
  };

  // Get color intensity based on status breakdown
  const getQuadrantColor = (quadrant: string) => {
    const stats = getQuadrantStats(quadrant);
    if (stats.medical > 0) return "rgba(239, 68, 68, 0.3)"; // Red for medical
    if (stats.missing > 0) return "rgba(245, 158, 11, 0.25)"; // Amber for missing
    if (stats.ara > 0) return "rgba(59, 130, 246, 0.2)"; // Blue for ARA
    if (stats.accounted === stats.total) return "rgba(16, 185, 129, 0.15)"; // Green for all safe
    return "rgba(100, 116, 139, 0.1)"; // Gray neutral
  };

  return (
    <div className="flex flex-col h-full">
      {/* Map Header with View Toggle */}
      <div className="flex justify-between items-center mb-2 shrink-0">
        <div>
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Floor 7 - 4 Irving Plaza</span>
          <h3 className="text-sm font-bold text-slate-200 uppercase font-sans flex items-center gap-2">
            <Users size={14} className="text-amber-500" />
            {occupants.length} Total Occupants
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-indigo-950 text-indigo-400 px-1.5 rounded font-mono">
            RS-17 Compliant
          </span>
          <div className="flex gap-0.5 bg-slate-900 rounded p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("MAP")}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-all ${
                viewMode === "MAP"
                  ? "bg-amber-600 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              MAP
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-all ${
                viewMode === "LIST"
                  ? "bg-amber-600 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              LIST
            </button>
          </div>
        </div>
      </div>

      {viewMode === "MAP" ? (
        <>
      {/* Simplified Map Container - No Zoom, Clear Overview */}
      <div className="flex-1 bg-slate-950 rounded-xl border border-slate-850 p-3 relative overflow-hidden min-h-[320px]">
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* Grid Background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0f172a" strokeWidth="1" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Floor Plan Border */}
          <rect x="15" y="15" width="370" height="270" rx="12" fill="none" stroke="#334155" strokeWidth="2.5" />

          {/* Interactive Quadrant Zones */}
          {[
            { quad: "NW", x: 15, y: 15, label: "NW QUADRANT\nEngineering" },
            { quad: "NE", x: 200, y: 15, label: "NE QUADRANT\nComms & Gov Affairs" },
            { quad: "SW", x: 15, y: 150, label: "SW QUADRANT\nLegal" },
            { quad: "SE", x: 200, y: 150, label: "SE QUADRANT\nIT & Visitors" }
          ].map(({ quad, x, y, label }) => {
            const stats = getQuadrantStats(quad);
            const isSelected = selectedQuadrant === quad;
            const isHovered = hoveredQuadrant === quad;
            const hasIssues = stats.medical > 0 || stats.missing > 0;

            return (
              <g
                key={quad}
                onMouseEnter={() => setHoveredQuadrant(quad)}
                onMouseLeave={() => setHoveredQuadrant(null)}
                onClick={() => onQuadrantClick && onQuadrantClick(quad)}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width="185"
                  height="135"
                  fill={
                    isSelected ? "rgba(245, 158, 11, 0.15)" :
                    isHovered ? "rgba(100, 116, 139, 0.1)" :
                    hasIssues ? "rgba(239, 68, 68, 0.05)" : "transparent"
                  }
                  stroke={
                    isSelected ? "#f59e0b" :
                    isHovered ? "#64748b" :
                    hasIssues ? "#ef4444" : "transparent"
                  }
                  strokeWidth={isSelected ? "2" : "1"}
                  strokeDasharray={isSelected ? "none" : "4 4"}
                  rx="8"
                />

                {/* Quadrant Label */}
                <text
                  x={x + 10}
                  y={y + 18}
                  fill={isSelected ? "#fbbf24" : "#475569"}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {label.split('\n')[0]}
                </text>
                <text
                  x={x + 10}
                  y={y + 28}
                  fill="#64748b"
                  fontSize="7"
                  fontFamily="sans-serif"
                >
                  {label.split('\n')[1]}
                </text>

                {/* Quadrant Stats Badge */}
                <g transform={`translate(${x + 150}, ${y + 10})`}>
                  <rect
                    x="0"
                    y="0"
                    width="30"
                    height="20"
                    rx="3"
                    fill={stats.missing === 0 && stats.medical === 0 ? "#064e3b" : "#7f1d1d"}
                    opacity="0.8"
                  />
                  <text x="15" y="9" fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle">
                    {stats.accounted}/{stats.total}
                  </text>
                  <text x="15" y="17" fill="#cbd5e1" fontSize="5.5" textAnchor="middle">
                    SAFE
                  </text>
                </g>

                {/* Warning indicator for issues */}
                {hasIssues && (
                  <g transform={`translate(${x + 155}, ${y + 35})`}>
                    <circle cx="0" cy="0" r="6" fill="#ef4444" className="animate-pulse" />
                    <text x="0" y="2" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">!</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Interior Quadrant Dividers */}
          <line x1="200" y1="15" x2="200" y2="285" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="15" y1="150" x2="385" y2="150" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Fire Hazard indicator near NE Area */}
          <g>
            <circle cx="310" cy="80" r="20" fill="#7f1d1d" fillOpacity="0.3" className="animate-pulse" />
            <circle cx="310" cy="80" r="12" fill="#ef4444" fillOpacity="0.7" />
            <circle cx="310" cy="80" r="16" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" />
            <text x="310" y="72" fill="#fef08a" fontSize="6" fontWeight="bold" textAnchor="middle">🔥</text>
            <text x="310" y="85" fill="#fef08a" fontSize="7" fontWeight="bold" textAnchor="middle">FIRE</text>
            <text x="310" y="93" fill="#fbbf24" fontSize="5.5" textAnchor="middle">NE OFFICE</text>
          </g>

          {/* Stair A - North Landing (Top Left) - Always Clear */}
          <g className="transition-all">
            <rect x="25" y="45" width="60" height="38" rx="5" fill="#022c22" stroke="#059669" strokeWidth="2" />
            <text x="55" y="60" fill="#a7f3d0" fontSize="9" fontWeight="bold" textAnchor="middle">STAIR A</text>
            <text x="55" y="70" fill="#34d399" fontSize="7" fontFamily="monospace" textAnchor="middle">NORTH</text>
            <text x="55" y="78" fill="#10b981" fontSize="6.5" fontWeight="bold" textAnchor="middle">✓ CLEAR</text>
          </g>

          {/* Stair B - South Landing (Bottom Right) - Interactive Toggle */}
          <g onClick={onToggleStairB} className="cursor-pointer transition-all hover:opacity-80">
            <rect
              x="305"
              y="217"
              width="60"
              height="38"
              rx="5"
              fill={stairBBlocked ? "#7f1d1d" : "#022c22"}
              stroke={stairBBlocked ? "#ef4444" : "#059669"}
              strokeWidth="2"
            />
            <text x="335" y="232" fill={stairBBlocked ? "#fca5a5" : "#a7f3d0"} fontSize="9" fontWeight="bold" textAnchor="middle">
              STAIR B
            </text>
            <text x="335" y="242" fill={stairBBlocked ? "#fbbf24" : "#34d399"} fontSize="7" fontFamily="monospace" textAnchor="middle">
              SOUTH
            </text>
            <text
              x="335"
              y="250"
              fill={stairBBlocked ? "#ef4444" : "#10b981"}
              fontSize="6.5"
              fontWeight="bold"
              textAnchor="middle"
              className={stairBBlocked ? "animate-pulse" : ""}
            >
              {stairBBlocked ? "⚠ BLOCKED" : "✓ CLEAR"}
            </text>
          </g>

          {/* Area of Rescue Assistance (ARA) Zones */}
          {[
            { x: 30, y: 100, label: "ARA NW", quad: "NW" },
            { x: 335, y: 100, label: "ARA NE", quad: "NE" },
            { x: 30, y: 180, label: "ARA SW", quad: "SW" },
            { x: 335, y: 180, label: "ARA SE", quad: "SE" }
          ].map((ara, index) => {
            const araOccupants = occupants.filter(o => o.quadrant === ara.quad && o.status === "ARA_STAGING");
            const hasOccupants = araOccupants.length > 0;

            return (
              <g key={index} className="transition-all">
                <rect
                  x={ara.x}
                  y={ara.y}
                  width="38"
                  height="18"
                  rx="3"
                  fill={hasOccupants ? "#1e3a8a" : "#172554"}
                  stroke={hasOccupants ? "#3b82f6" : "#3b82f6"}
                  strokeWidth={hasOccupants ? "2" : "1"}
                  className={hasOccupants ? "animate-pulse" : ""}
                />
                <text x={ara.x + 19} y={ara.y + 10} fill="#93c5fd" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                  {ara.label}
                </text>
                {hasOccupants && (
                  <text x={ara.x + 19} y={ara.y + 16} fill="#fbbf24" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                    {araOccupants.length} WAITING
                  </text>
                )}
              </g>
            );
          })}

          {/* Evacuation Path Indicators */}
          {!stairBBlocked && (
            <>
              {/* Path from NW to Stair A */}
              <path d="M 100 90 Q 70 70 55 60" stroke="#34d399" strokeWidth="1" strokeDasharray="3 2" fill="none" opacity="0.4" />
              {/* Path from SE to Stair B */}
              <path d="M 260 200 Q 300 220 335 230" stroke="#34d399" strokeWidth="1" strokeDasharray="3 2" fill="none" opacity="0.4" />
            </>
          )}
          {stairBBlocked && (
            <>
              {/* Rerouted path from SE to Stair A */}
              <path d="M 260 200 Q 150 120 55 60" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.6" />
            </>
          )}

          {/* DENSITY VISUALIZATION - Clear view for 200-400 people */}
          {quadrants.map(quad => {
            const stats = getQuadrantStats(quad);

            // Position for density display in each quadrant center
            const positions: Record<string, {x: number, y: number}> = {
              NW: { x: 107, y: 92 },
              NE: { x: 292, y: 92 },
              SW: { x: 107, y: 217 },
              SE: { x: 292, y: 217 }
            };

            const pos = positions[quad];

            if (stats.total === 0) return null;

            // Size circle based on density (but cap it)
            const circleRadius = Math.max(20, Math.min(50, stats.total * 0.4));

            return (
              <g key={quad}>
                {/* Heat map background circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={circleRadius}
                  fill={getQuadrantColor(quad)}
                  opacity="0.5"
                  className="transition-all"
                />

                {/* Central count display */}
                <g transform={`translate(${pos.x}, ${pos.y})`}>
                  <circle r="24" fill="#0f172a" opacity="0.95" stroke="#475569" strokeWidth="1.5" />

                  {/* Total count - Large and bold */}
                  <text y="-3" fill="#e2e8f0" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                    {stats.total}
                  </text>

                  {/* Status breakdown - Compact */}
                  <text y="8" fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">
                    {stats.accounted > 0 && `✓${stats.accounted} `}
                    {stats.medical > 0 && `⚕${stats.medical} `}
                    {stats.missing > 0 && `?${stats.missing}`}
                  </text>

                  {/* Quadrant label */}
                  <text y="16" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                    {quad}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Updated Legend - Density Mode */}
          <g transform="translate(15, 265)">
            <text x="0" y="0" fill="#64748b" fontSize="6" fontWeight="bold" fontFamily="monospace">
              LEGEND:
            </text>
            <circle cx="30" cy="-2" r="4" fill="#10b981" />
            <text x="37" y="1" fill="#10b981" fontSize="5.5" fontWeight="bold">✓ Safe</text>

            <circle cx="70" cy="-2" r="4" fill="#ef4444" />
            <text x="77" y="1" fill="#ef4444" fontSize="5.5" fontWeight="bold">⚕ Medical</text>

            <circle cx="120" cy="-2" r="4" fill="#3b82f6" />
            <text x="127" y="1" fill="#3b82f6" fontSize="5.5" fontWeight="bold">♿ ARA</text>

            <circle cx="165" cy="-2" r="4" fill="#f59e0b" />
            <text x="172" y="1" fill="#f59e0b" fontSize="5.5" fontWeight="bold">? Missing</text>

            <text x="220" y="1" fill="#475569" fontSize="5" fontFamily="monospace">
              | DENSITY VIEW (200-400 capacity)
            </text>
          </g>
        </svg>
      </div>
      </>
      ) : (
        /* LIST VIEW - Detailed breakdown for all occupants */
        <div className="flex-1 bg-slate-950 rounded-xl border border-slate-850 overflow-hidden">
          <div className="h-full overflow-y-auto p-3 space-y-2">
            {quadrants.map(quad => {
              const quadOccupants = getQuadrantOccupants(quad);
              const stats = getQuadrantStats(quad);

              if (quadOccupants.length === 0) return null;

              return (
                <div key={quad} className="space-y-1">
                  {/* Quadrant Header */}
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedQuadrant === quad
                        ? "bg-amber-950/30 border-amber-600"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                    }`}
                    onClick={() => onQuadrantClick && onQuadrantClick(quad)}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-amber-500" />
                      <span className="text-sm font-bold text-slate-200 font-mono">{quad} QUADRANT</span>
                      <span className="text-[10px] text-slate-500">
                        ({stats.total} {stats.total === 1 ? 'person' : 'people'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      {stats.accounted > 0 && (
                        <span className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                          ✓ {stats.accounted}
                        </span>
                      )}
                      {stats.medical > 0 && (
                        <span className="bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-mono animate-pulse">
                          ⚕ {stats.medical}
                        </span>
                      )}
                      {stats.ara > 0 && (
                        <span className="bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                          ♿ {stats.ara}
                        </span>
                      )}
                      {stats.missing > 0 && (
                        <span className="bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                          ? {stats.missing}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Occupant List - Only show if quadrant is selected or if there are issues */}
                  {(selectedQuadrant === quad || stats.medical > 0 || stats.missing > 0) && (
                    <div className="ml-4 space-y-1">
                      {quadOccupants
                        .filter(occ =>
                          selectedQuadrant === quad ||
                          occ.status === "MEDICAL" ||
                          occ.status === "MISSING"
                        )
                        .slice(0, 20) // Show max 20 in list to prevent overwhelming UI
                        .map(occ => (
                          <button
                            type="button"
                            key={occ.id}
                            onClick={() => onOccupantClick && onOccupantClick(occ)}
                            className="w-full flex items-center justify-between p-1.5 rounded bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 hover:bg-slate-900/60 transition-all text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Activity
                                size={10}
                                className={
                                  occ.status === "ACCOUNTED" ? "text-emerald-500" :
                                  occ.status === "MEDICAL" ? "text-red-500 animate-pulse" :
                                  occ.status === "ARA_STAGING" ? "text-blue-500" : "text-amber-500"
                                }
                              />
                              <span className="text-[10px] text-slate-300 font-mono">{occ.badgeId}</span>
                              <span className="text-[10px] text-slate-400">{occ.role}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {occ.mobilityImpaired && (
                                <span className="text-[9px] text-blue-400">♿</span>
                              )}
                              <span className={`text-[9px] font-bold font-mono ${
                                occ.status === "ACCOUNTED" ? "text-emerald-500" :
                                occ.status === "MEDICAL" ? "text-red-500" :
                                occ.status === "ARA_STAGING" ? "text-blue-500" : "text-amber-500"
                              }`}>
                                {occ.status}
                              </span>
                            </div>
                          </button>
                        ))}
                      {quadOccupants.length > 20 && selectedQuadrant === quad && (
                        <div className="text-[9px] text-slate-500 text-center py-1 font-mono">
                          ... and {quadOccupants.length - 20} more (use FSD Locator panel for full list)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className="mt-2 grid grid-cols-4 gap-1.5 shrink-0">
        {quadrants.map(quad => {
          const stats = getQuadrantStats(quad);
          const completionRate = stats.total > 0 ? Math.round((stats.accounted / stats.total) * 100) : 0;

          return (
            <button
              type="button"
              key={quad}
              onClick={() => onQuadrantClick && onQuadrantClick(quad)}
              className={`p-1.5 rounded-lg border transition-all text-left ${
                selectedQuadrant === quad
                  ? "bg-amber-950/40 border-amber-700"
                  : "bg-slate-900/40 border-slate-800 hover:bg-slate-850 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-300">{quad}</span>
                <span className={`text-[8px] font-bold ${
                  completionRate === 100 ? "text-emerald-400" :
                  completionRate >= 75 ? "text-amber-400" : "text-red-400"
                }`}>
                  {completionRate}%
                </span>
              </div>
              <div className="text-[7.5px] text-slate-500 font-mono">
                {stats.accounted}/{stats.total} safe
              </div>
              {(stats.medical > 0 || stats.ara > 0) && (
                <div className="text-[7px] text-red-400 font-bold mt-0.5">
                  {stats.medical > 0 && `${stats.medical} medical `}
                  {stats.ara > 0 && `${stats.ara} ARA`}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

