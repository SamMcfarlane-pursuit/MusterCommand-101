import React, { useState } from "react";
import { Occupant } from "../types";
import { ZoomIn, ZoomOut, Maximize2, AlertTriangle, Users, MapPin } from "lucide-react";

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
  const [hoveredOccupant, setHoveredOccupant] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);

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

  const getOccupantCoords = (occ: Occupant) => {
    // Improved distribution algorithm for better spacing
    const baseCoords: Record<string, {x: number, y: number}[]> = {
      NW: [
        { x: 95, y: 70 }, { x: 130, y: 70 }, { x: 95, y: 105 }, { x: 130, y: 105 },
        { x: 110, y: 85 }, { x: 150, y: 85 }, { x: 75, y: 90 }
      ],
      NE: [
        { x: 240, y: 70 }, { x: 280, y: 70 }, { x: 260, y: 100 }, { x: 300, y: 100 },
        { x: 260, y: 85 }, { x: 320, y: 85 }
      ],
      SW: [
        { x: 95, y: 195 }, { x: 130, y: 195 }, { x: 120, y: 230 }, { x: 150, y: 220 },
        { x: 80, y: 215 }
      ],
      SE: [
        { x: 240, y: 195 }, { x: 280, y: 195 }, { x: 260, y: 230 }, { x: 300, y: 220 },
        { x: 240, y: 215 }
      ],
      Center: [
        { x: 180, y: 140 }, { x: 210, y: 140 }, { x: 195, y: 160 }
      ]
    };

    const quadCoords = baseCoords[occ.quadrant] || baseCoords.Center;
    const index = occupants.filter(o => o.quadrant === occ.quadrant).indexOf(occ);
    return quadCoords[index % quadCoords.length] || quadCoords[0];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Map Header with Controls */}
      <div className="flex justify-between items-center mb-2 shrink-0">
        <div>
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Interactive Architectural Map</span>
          <h3 className="text-sm font-bold text-slate-200 uppercase font-sans">Floor 7 Pilot Plan (4 Irving Plaza)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-indigo-950 text-indigo-400 px-1.5 rounded font-mono">
            RS-17 Compliant
          </span>
          <div className="flex gap-0.5">
            <button
              onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.2))}
              className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white transition-all"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.2))}
              className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white transition-all"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white transition-all"
              title="Reset Zoom"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-slate-950 rounded-xl border border-slate-850 p-2 relative flex items-center justify-center overflow-hidden min-h-[320px]">
        <svg 
          viewBox="0 0 400 300" 
          className="w-full h-full transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})`, maxHeight: '420px' }}
        >
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

          {/* Occupants dynamically plotted with enhanced visuals */}
          {occupants.map((occ) => {
            const coord = getOccupantCoords(occ);
            const isHovered = hoveredOccupant === occ.id;

            return (
              <g
                key={occ.id}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredOccupant(occ.id)}
                onMouseLeave={() => setHoveredOccupant(null)}
                onClick={() => onOccupantClick && onOccupantClick(occ)}
              >
                {/* Occupant status ring */}
                {isHovered && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="10"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                )}

                {/* Occupant dot */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? "8" : "6.5"}
                  fill={
                    occ.status === "ACCOUNTED" ? "#10b981" :
                    occ.status === "MEDICAL" ? "#ef4444" :
                    occ.status === "ARA_STAGING" ? "#3b82f6" : "#94a3b8"
                  }
                  stroke={isHovered ? "#fbbf24" : "#0f172a"}
                  strokeWidth={isHovered ? "2" : "1.2"}
                  filter={occ.status === "MEDICAL" ? "url(#glow)" : "none"}
                  className={occ.status === "MEDICAL" ? "animate-pulse" : ""}
                />

                {/* Occupant ID label */}
                <text
                  x={coord.x}
                  y={coord.y - 11}
                  fill={isHovered ? "#fbbf24" : "#cbd5e1"}
                  fontSize={isHovered ? "6.5" : "5.5"}
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight={isHovered ? "bold" : "normal"}
                >
                  {occ.id.replace("usr_", "")}
                </text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g transform={`translate(${coord.x + 15}, ${coord.y - 25})`}>
                    <rect
                      x="0"
                      y="0"
                      width="80"
                      height="35"
                      rx="4"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1"
                      opacity="0.95"
                    />
                    <text x="5" y="10" fill="#f1f5f9" fontSize="6" fontWeight="bold">
                      {occ.nameEncrypted}
                    </text>
                    <text x="5" y="18" fill="#cbd5e1" fontSize="5">
                      Role: {occ.role}
                    </text>
                    <text x="5" y="25" fill="#94a3b8" fontSize="5">
                      Badge: {occ.badgeId}
                    </text>
                    <text x="5" y="32" fill={
                      occ.status === "ACCOUNTED" ? "#10b981" :
                      occ.status === "MEDICAL" ? "#ef4444" :
                      occ.status === "ARA_STAGING" ? "#3b82f6" : "#94a3b8"
                    } fontSize="5.5" fontWeight="bold">
                      Status: {occ.status}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <g transform="translate(15, 260)">
            <text x="0" y="0" fill="#64748b" fontSize="5.5" fontWeight="bold" fontFamily="monospace">
              LEGEND:
            </text>
            <circle cx="28" cy="-2" r="3" fill="#10b981" />
            <text x="33" y="0" fill="#94a3b8" fontSize="5">Accounted</text>

            <circle cx="65" cy="-2" r="3" fill="#ef4444" />
            <text x="70" y="0" fill="#94a3b8" fontSize="5">Medical</text>

            <circle cx="98" cy="-2" r="3" fill="#3b82f6" />
            <text x="103" y="0" fill="#94a3b8" fontSize="5">ARA</text>

            <circle cx="122" cy="-2" r="3" fill="#94a3b8" />
            <text x="127" y="0" fill="#94a3b8" fontSize="5">Missing</text>
          </g>
        </svg>
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-2 grid grid-cols-4 gap-1.5 shrink-0">
        {quadrants.map(quad => {
          const stats = getQuadrantStats(quad);
          const completionRate = stats.total > 0 ? Math.round((stats.accounted / stats.total) * 100) : 0;

          return (
            <button
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

