import React from "react";
import "./CompilerLoader.css";

const DEFAULT_STAGES = ["Lexing", "Parsing", "Checking", "Building AST"];

function CompilerLoader({
  label = "Compiling",
  stages = DEFAULT_STAGES,
  compact = false,
  overlay = false,
  launcher = false,
  mark = "chip",
}) {
  const isPascalMark = mark === "pascal";

  const loader = (
    <div
      className={`compiler-loader ${compact ? "compiler-loader--compact" : ""} ${
        launcher ? "compiler-loader--launcher" : ""
      } ${isPascalMark ? "compiler-loader--pascal" : ""}`}
      role="status"
      aria-live="polite"
    >
      {isPascalMark ? (
        <div className="pascal-loader" aria-hidden="true">
          <span className="pascal-loader__mark">P</span>
          <span className="pascal-loader__orbit" />
        </div>
      ) : (
        <div className="chip-loader" aria-hidden="true">
          <div className="chip-loader__pins chip-loader__pins--top">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={`top-${index}`} style={{ "--pin-delay": `${index * 0.05}s` }} />
            ))}
          </div>
          <div className="chip-loader__pins chip-loader__pins--right">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={`right-${index}`} style={{ "--pin-delay": `${0.3 + index * 0.05}s` }} />
            ))}
          </div>
          <div className="chip-loader__pins chip-loader__pins--bottom">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={`bottom-${index}`} style={{ "--pin-delay": `${0.6 + index * 0.05}s` }} />
            ))}
          </div>
          <div className="chip-loader__pins chip-loader__pins--left">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={`left-${index}`} style={{ "--pin-delay": `${0.9 + index * 0.05}s` }} />
            ))}
          </div>

          <div className="chip-loader__body">
            <span className="chip-loader__corner chip-loader__corner--tl" />
            <span className="chip-loader__corner chip-loader__corner--tr" />
            <span className="chip-loader__corner chip-loader__corner--br" />
            <span className="chip-loader__corner chip-loader__corner--bl" />
            <span className="chip-loader__trace chip-loader__trace--one" />
            <span className="chip-loader__trace chip-loader__trace--two" />
            <span className="chip-loader__trace chip-loader__trace--three" />
            <span className="chip-loader__trace chip-loader__trace--four" />
            <div className="chip-loader__core">
              <span>CPU</span>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="compiler-loader__copy">
          <span className="compiler-loader__label">{label}</span>
          <div className="compiler-loader__pipeline">
            {stages.map((stage, index) => (
              <span key={stage} style={{ "--stage-delay": `${index * 0.35}s` }}>
                {stage}
              </span>
            ))}
          </div>
          <div className="compiler-loader__code" aria-hidden="true">
            <span>program main;</span>
            <span>token -&gt; AST -&gt; diagnostics</span>
            <span>end.</span>
          </div>
        </div>
      )}
    </div>
  );

  if (!overlay) return loader;

  return (
    <div className="compiler-loader-overlay">
      <div className="compiler-loader-panel">{loader}</div>
    </div>
  );
}

export default CompilerLoader;
