import { useRef, useState } from "react";
import "./PatternViewer.css";

const PAD = 4; // cm of padding around each piece

function toPoints(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

function boundsOf(piece) {
  const all = [...piece.outline, ...(piece.seam_allowance || [])];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  return {
    minX: Math.floor(Math.min(...xs)) - PAD,
    minY: Math.floor(Math.min(...ys)) - PAD,
    maxX: Math.ceil(Math.max(...xs)) + PAD,
    maxY: Math.ceil(Math.max(...ys)) + PAD,
  };
}

function PieceView({ piece, showGrid, showSeam, showMarks, svgRef }) {
  const b = boundsOf(piece);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const id = piece.id;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${b.minX} ${b.minY} ${w} ${h}`}
      width={`${w}cm`}
      height={`${h}cm`}
      className="piece__svg"
      role="img"
      aria-label={`${piece.name}, ${piece.width_cm} by ${piece.height_cm} cm`}
    >
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#2a241d" />
        </marker>
        <pattern id={`g1-${id}`} width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M1 0 L0 0 0 1" fill="none" stroke="#e8e0d3" strokeWidth="0.04" />
        </pattern>
        <pattern id={`g5-${id}`} width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0 L0 0 0 5" fill="none" stroke="#d3c8b6" strokeWidth="0.07" />
        </pattern>
      </defs>

      <rect x={b.minX} y={b.minY} width={w} height={h} fill="#fff" />
      {showGrid && (
        <>
          <rect x={b.minX} y={b.minY} width={w} height={h} fill={`url(#g1-${id})`} />
          <rect x={b.minX} y={b.minY} width={w} height={h} fill={`url(#g5-${id})`} />
        </>
      )}

      {/* Cutting line (outer, with seam allowance) */}
      {showSeam && piece.seam_allowance?.length > 0 && (
        <polygon
          points={toPoints(piece.seam_allowance)}
          fill="none"
          stroke="#b5532f"
          strokeWidth="0.12"
          strokeDasharray="0.6 0.4"
          strokeLinejoin="round"
        />
      )}

      {/* Stitching line (traced outline) */}
      <polygon
        points={toPoints(piece.outline)}
        fill="rgba(181, 83, 47, 0.06)"
        stroke="#2a241d"
        strokeWidth="0.14"
        strokeLinejoin="round"
      />

      {/* Markings */}
      {showMarks &&
        (piece.markings || []).map((m) => {
          if (m.type === "grainline") {
            const [a, z] = m.points;
            return (
              <g key={m.id}>
                <line
                  x1={a[0]}
                  y1={a[1]}
                  x2={z[0]}
                  y2={z[1]}
                  stroke="#2a241d"
                  strokeWidth="0.12"
                  markerStart={`url(#arrow-${id})`}
                  markerEnd={`url(#arrow-${id})`}
                />
                <text
                  x={a[0] + 0.8}
                  y={(a[1] + z[1]) / 2}
                  fontSize="1.6"
                  fill="#6b6052"
                  transform={`rotate(-90 ${a[0] + 0.8} ${(a[1] + z[1]) / 2})`}
                  textAnchor="middle"
                >
                  Grainline
                </text>
              </g>
            );
          }
          if (m.type === "notch") {
            const [a, z] = m.points;
            return (
              <line
                key={m.id}
                x1={a[0]}
                y1={a[1]}
                x2={z[0]}
                y2={z[1]}
                stroke="#2a241d"
                strokeWidth="0.25"
                strokeLinecap="round"
              />
            );
          }
          if (m.type === "dart") {
            return (
              <polyline
                key={m.id}
                points={toPoints(m.points)}
                fill="none"
                stroke="#7a3fb0"
                strokeWidth="0.14"
                strokeLinejoin="round"
              />
            );
          }
          return null;
        })}
    </svg>
  );
}

export default function PatternViewer({ pattern }) {
  const svgRefs = useRef({});
  const [showGrid, setShowGrid] = useState(true);
  const [showSeam, setShowSeam] = useState(true);
  const [showMarks, setShowMarks] = useState(true);

  if (!pattern?.pieces?.length) return null;

  function downloadSvg(piece) {
    const svg = svgRefs.current[piece.id];
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${piece.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="viewer">
      <div className="viewer__toolbar">
        <label>
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          1 cm grid
        </label>
        <label>
          <input type="checkbox" checked={showSeam} onChange={(e) => setShowSeam(e.target.checked)} />
          Cutting line
        </label>
        <label>
          <input type="checkbox" checked={showMarks} onChange={(e) => setShowMarks(e.target.checked)} />
          Markings
        </label>
      </div>

      <ul className="viewer__legend">
        <li><span className="key key--stitch" /> Stitching line</li>
        <li><span className="key key--cut" /> Cutting line</li>
        <li><span className="key key--dart" /> Dart</li>
        <li><span className="key key--notch" /> Notch</li>
      </ul>

      {pattern.pieces.map((piece) => (
        <article className="piece" key={piece.id}>
          <header className="piece__head">
            <div>
              <h3>{piece.name}</h3>
              <p>
                {piece.width_cm} × {piece.height_cm} cm
                {pattern.scale_assumed && " (scale estimated)"}
              </p>
            </div>
            <button className="viewer__btn" onClick={() => downloadSvg(piece)}>
              Download SVG
            </button>
          </header>

          <div className="piece__canvas">
            <PieceView
              piece={piece}
              showGrid={showGrid}
              showSeam={showSeam}
              showMarks={showMarks}
              svgRef={(el) => (svgRefs.current[piece.id] = el)}
            />
          </div>
        </article>
      ))}

      {pattern.warnings?.length > 0 && (
        <ul className="viewer__warnings">
          {pattern.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}