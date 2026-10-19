import React from "react";

/**
 * High-definition vector QR Code rendering that resembles the authentic gate scanner pass.
 */
export default function QRCodeSVG({
  value = "TKT-7F3K-92QD-XM41",
  className = "w-44 h-44",
}: {
  value?: string;
  className?: string;
}) {
  // Deterministic pseudo-random but stable pattern based on value for realistic QR matrix
  const size = 25; // 25x25 grid
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  // Helper to draw finder pattern
  const setFinder = (top: number, left: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[top + r][left + c] = isBorder || isCenter;
      }
    }
  };

  // Top-left finder
  setFinder(0, 0);
  // Top-right finder
  setFinder(0, size - 7);
  // Bottom-left finder
  setFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Pseudo-random data fill based on hash of value
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones and timing patterns
      const inTopLeft = r <= 7 && c <= 7;
      const inTopRight = r <= 7 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c <= 7;
      const inTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
        const seed = Math.sin(r * 31 + c * 17 + hash) * 10000;
        matrix[r][c] = seed - Math.floor(seed) > 0.48;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-label={`QR Code for ticket ${value}`}
    >
      <rect width={size} height={size} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" />
          ) : null
        )
      )}
    </svg>
  );
}
