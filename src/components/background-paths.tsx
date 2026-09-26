"use client";

import React from "react";

function FloatingPath({
  position,
  index,
}: {
  position: number;
  index: number;
}) {
  const duration = 20 + (index % 12) * 1.5;
  const strokeOpacity = 0.05 + index * 0.015;

  return (
    <path
      d={`M-${380 - index * 5 * position} -${189 + index * 6}C-${380 - index * 5 * position} -${189 + index * 6} -${312 - index * 5 * position} ${216 - index * 6} ${152 - index * 5 * position} ${343 - index * 6}C${616 - index * 5 * position} ${470 - index * 6} ${684 - index * 5 * position} ${875 - index * 6} ${684 - index * 5 * position} ${875 - index * 6}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={0.8}
      strokeOpacity={strokeOpacity}
      className="transition-all duration-1000 ease-in-out"
      style={{
        strokeDasharray: "2000",
        animation: `floatPath ${duration}s linear infinite`,
      }}
    />
  );
}

export function BackgroundPaths() {
  const count = 36;
  const indices = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden text-white/[0.2] select-none"
      aria-hidden="true"
    >
      {/* Volumetric glow superior naranja Varkentis */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-[#F26101] opacity-[0.10] blur-[140px] rounded-full pointer-events-none" />

      {/* Capa de líneas SVG en loop infinito */}
      <svg
        className="w-full h-full opacity-60"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g id="paths-left">
          {indices.map((i) => (
            <FloatingPath key={`left-${i}`} position={1} index={i} />
          ))}
        </g>
        <g id="paths-right">
          {indices.map((i) => (
            <FloatingPath key={`right-${i}`} position={-1} index={i} />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default BackgroundPaths;
