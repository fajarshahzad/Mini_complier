import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import CompilerLoader from "../components/CompilerLoader";
import "./dashboard.css";

const SAMPLES = {
  factorial: `{ Valid Pascal program computing factorial }
program FactorialProg;
var
  n, i, fact : integer;
begin
  n := 5;
  fact := 1;
  i := 1;
  while i <= n do
  begin
    fact := fact * i;
    i := i + 1;
  end;
  writeln(fact);
end.`,
  syntaxError: `{ Contains syntax errors to demonstrate parser panic-mode recovery }
program SyntaxErrProg;
var
  a, b : integer;
var
  c : real;
begin
  a := 10;
  b := ;    { Syntax Error: missing expression }
  c := 3.14;
  if a > 5 then
    write(a)  { Syntax Error: missing semicolon or statement }
  else
    write(b);
end.`,
  semanticError: `{ Contains semantic errors to demonstrate declaration and type checks }
program SemanticErrProg;
var
  x, x : integer; { Semantic Error: duplicate declaration }
var
  y : integer;
var
  z : real;
begin
  y := 10;
  z := 'a';     { Semantic Error: type mismatch (char assigned to real) }
  w := 50;      { Semantic Error: undeclared variable }
end.`,
};

const MODES = [
  { id: "editor", label: "Editor", icon: "editor" },
  { id: "engine", label: "Engine", icon: "engine" },
  { id: "console", label: "Console", icon: "console" },
];

const MIN_LOADER_MS = 1100;
const DASHBOARD_LAUNCHER_MS = 500;

const waitForLoader = (startedAt) => {
  const remaining = MIN_LOADER_MS - (Date.now() - startedAt);
  return remaining > 0 ? new Promise((resolve) => setTimeout(resolve, remaining)) : Promise.resolve();
};

function NavIcon({ type }) {
  if (type === "editor") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (type === "engine") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function Dashboard() {
  const [code, setCode] = useState(SAMPLES.factorial);
  const [workspaceMode, setWorkspaceMode] = useState("editor");
  const [username, setUsername] = useState("Guest");
  const [grammarData, setGrammarData] = useState(null);
  const [compilationResult, setCompilationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardLaunching, setDashboardLaunching] = useState(true);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [grammarExpanded, setGrammarExpanded] = useState(false);
  const [strictParser, setStrictParser] = useState(true);
  const [lexerOptimizer, setLexerOptimizer] = useState(false);
  const [debugLogLevel, setDebugLogLevel] = useState(2);
  const [astGeneration, setAstGeneration] = useState(0);

  const navigate = useNavigate();
  const errorCount = compilationResult?.errors?.length || 0;

  useEffect(() => {
    if (!api.isAuthenticated()) {
      navigate("/");
      return;
    }
    setUsername(api.getUsername());
    api
      .getGrammar()
      .then((data) => setGrammarData(data))
      .catch((err) => setError("Failed to fetch grammar info: " + err.message));
    handleCompile({ showLoader: false });
    const launchTimer = setTimeout(() => {
      setDashboardLaunching(false);
    }, DASHBOARD_LAUNCHER_MS);

    return () => clearTimeout(launchTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = () => {
    api.logout();
    navigate("/");
  };

  const handleCompile = async ({ showLoader = true } = {}) => {
    const loaderStartedAt = Date.now();
    if (showLoader) setLoading(true);
    setError("");
    try {
      const res = await api.compile(code);
      setCompilationResult(res);
      if (res.errors?.length > 0) {
        setWorkspaceMode("console");
      } else if (res.ast) {
        setAstGeneration((g) => g + 1);
      }
    } catch (err) {
      setError(err.message || "Compilation request failed.");
    } finally {
      if (showLoader) {
        await waitForLoader(loaderStartedAt);
        setLoading(false);
      }
    }
  };

  const loadSample = (type) => {
    if (type) setCode(SAMPLES[type]);
  };

  const renderASTNode = (node, depth = 0) => {
    if (!node) return null;
    const delay = Math.min(depth * 40, 400);
    return (
      <div
        className="ast-tree-node ast-node-enter"
        key={`${node.node_type}-${depth}-${node.name || node.value || ""}`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className={`node-badge ${node.node_type}`}>
          <strong>{node.node_type}</strong>
          {node.name && <span className="node-val"> ({node.name})</span>}
          {node.value != null && node.value !== "" && (
            <span className="node-val"> = {String(node.value)}</span>
          )}
          {node.variable && <span className="node-val"> (Var: {node.variable})</span>}
          {node.type && <span className="node-val"> [Type: {node.type}]</span>}
          {node.op && <span className="node-val"> [Op: {node.op}]</span>}
          {node.variables && (
            <span className="node-val"> (Vars: {node.variables.join(", ")})</span>
          )}
        </div>
        {((node.children?.length > 0) ||
          node.condition ||
          node.then ||
          node.else ||
          node.left ||
          node.right ||
          node.expression ||
          node.body) && (
          <div className="node-children">
            {node.children?.map((child, i) => renderASTNode(child, depth + 1 + i))}
            {node.condition && (
              <div className="ast-child-wrapper">
                <span className="edge-label">condition</span>
                {renderASTNode(node.condition, depth + 1)}
              </div>
            )}
            {node.then && (
              <div className="ast-child-wrapper">
                <span className="edge-label">then</span>
                {renderASTNode(node.then, depth + 1)}
              </div>
            )}
            {node.else && (
              <div className="ast-child-wrapper">
                <span className="edge-label">else</span>
                {renderASTNode(node.else, depth + 1)}
              </div>
            )}
            {node.body && (
              <div className="ast-child-wrapper">
                <span className="edge-label">body</span>
                {renderASTNode(node.body, depth + 1)}
              </div>
            )}
            {node.left && (
              <div className="ast-child-wrapper">
                <span className="edge-label">left</span>
                {renderASTNode(node.left, depth + 1)}
              </div>
            )}
            {node.right && (
              <div className="ast-child-wrapper">
                <span className="edge-label">right</span>
                {renderASTNode(node.right, depth + 1)}
              </div>
            )}
            {node.expression && (
              <div className="ast-child-wrapper">
                <span className="edge-label">expr</span>
                {renderASTNode(node.expression, depth + 1)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTokenTable = () => {
    const tokens = compilationResult?.tokens;
    if (!tokens?.length) {
      return <p className="empty-msg">No tokens yet. Run compile.</p>;
    }
    return (
      <table className="output-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Type</th>
            <th>Value</th>
            <th>Line</th>
            <th>Col</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((tok, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>
                <span className={`tok-type ${tok.type}`}>{tok.type}</span>
              </td>
              <td>
                <code>{tok.value}</code>
              </td>
              <td>{tok.line}</td>
              <td>{tok.column}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderSymbolTable = () => {
    const scopes = compilationResult?.symbol_table;
    if (!scopes?.length) {
      return <p className="empty-msg">No symbols yet. Run compile.</p>;
    }
    return (
      <div className="scopes-tree-wrapper">
        {scopes.map((scope) => (
          <div
            className="scope-block-card"
            key={scope.scope_id}
            style={{ marginLeft: `${scope.scope_id * 16}px` }}
          >
            <div className="scope-card-header">
              <strong>
                Scope {scope.scope_id}: <code>{scope.scope_name}</code>
              </strong>
              {scope.parent_id != null && (
                <span className="parent-scope-label">Parent: {scope.parent_id}</span>
              )}
            </div>
            {Object.keys(scope.entries).length > 0 ? (
              <table className="output-table mini-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Type</th>
                    <th>Level</th>
                    <th>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(scope.entries).map((sym, i) => (
                    <tr key={i}>
                      <td>
                        <code>{sym.name}</code>
                      </td>
                      <td>
                        <span className="badge-kind">{sym.kind}</span>
                      </td>
                      <td>
                        <span className="badge-type">{sym.type}</span>
                      </td>
                      <td>{sym.scope_level}</td>
                      <td>{sym.line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-msg">Empty scope.</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTraceTable = (trace, success, parserLabel) => {
    if (!trace?.length) {
      return <p className="empty-msg">No trace available.</p>;
    }
    const isLL = parserLabel === "LL(1)";
    return (
      <>
        <div className="parser-status">
          {success ? (
            <span className="status-pill success">{parserLabel} succeeded</span>
          ) : (
            <span className="status-pill error">{parserLabel} failed or recovered</span>
          )}
        </div>
        <table className="output-table font-mono">
          <thead>
            <tr>
              <th>Step</th>
              {isLL ? (
                <>
                  <th>Stack</th>
                  <th>Input</th>
                </>
              ) : (
                <>
                  <th>States</th>
                  <th>Symbols</th>
                  <th>Input</th>
                </>
              )}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {trace.map((step, idx) => (
              <tr key={idx} className={step.action?.includes("Error") ? "error-row" : ""}>
                <td>{idx + 1}</td>
                {isLL ? (
                  <>
                    <td className="stack-td">
                      <code>{step.stack}</code>
                    </td>
                    <td className="input-td">
                      <code>{step.input}</code>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <code>{step.states}</code>
                    </td>
                    <td>
                      <code>{step.symbols}</code>
                    </td>
                    <td className="input-td">
                      <code>{step.input}</code>
                    </td>
                  </>
                )}
                <td>
                  <span
                    className={`action-badge ${
                      step.action?.startsWith("Apply") || step.action?.startsWith("Reduce")
                        ? "apply"
                        : step.action?.startsWith("Match") || step.action?.startsWith("Shift")
                          ? "match"
                          : "err"
                    }`}
                  >
                    {step.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="main-header">
        <div className="header-left">
          <div className="header-logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Pascal Compiler</span>
          </div>
          <button type="button" className="btn-settings" onClick={() => setShowSettings(true)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Settings
          </button>
        </div>
        <div className="header-right">
          <span className="user-profile">
            <span className="avatar">{username[0]?.toUpperCase()}</span>
            {username}
          </span>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="dashboard-body">
        <nav className="workspace-nav" aria-label="Workspace modes">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`nav-item ${workspaceMode === mode.id ? "active" : ""}`}
              onClick={() => setWorkspaceMode(mode.id)}
            >
              <NavIcon type={mode.icon} />
              <span>{mode.label}</span>
              {mode.id === "console" && errorCount > 0 && (
                <span className="nav-badge">{errorCount}</span>
              )}
            </button>
          ))}
        </nav>

        <main className="workspace-main">
          {workspaceMode === "editor" && (
            <div key="editor" className="mode-panel editor-mode">
              <div className="editor-column">
                <div className="panel-toolbar">
                  <h3>Source</h3>
                  <div className="toolbar-actions">
                    <select
                      defaultValue="factorial"
                      onChange={(e) => loadSample(e.target.value)}
                      aria-label="Sample program"
                    >
                      <option value="factorial">Factorial (valid)</option>
                      <option value="syntaxError">Syntax errors</option>
                      <option value="semanticError">Semantic errors</option>
                    </select>
                    <button type="button" className="btn-compile" onClick={handleCompile} disabled={loading}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      {loading ? "Compiling..." : "Compile"}
                    </button>
                  </div>
                </div>
                <div className="code-editor-wrapper">
                  <textarea
                    className="code-textarea"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Write Pascal here…"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="inspector-column">
                <section className="inspector-section">
                  <div className="inspector-header">
                    Lexer · {compilationResult?.tokens?.length || 0} tokens
                  </div>
                  <div className="inspector-scroll">{renderTokenTable()}</div>
                </section>
                <section className="inspector-section">
                  <div className="inspector-header">Symbol table</div>
                  <div className="inspector-scroll">{renderSymbolTable()}</div>
                </section>
              </div>
            </div>
          )}

          {workspaceMode === "engine" && (
            <div key="engine" className="mode-panel engine-mode">
              {error && <div className="panel-alert error" style={{ margin: "16px 28px 0" }}>{error}</div>}

              <section className="engine-section">
                <h4>Parse structure</h4>
                <div className="engine-split">
                  <div className="engine-split-panel">
                    <h5 style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>Abstract syntax tree</h5>
                    {compilationResult?.ast ? (
                      <div className="ast-tree-root" key={astGeneration}>
                        {renderASTNode(compilationResult.ast)}
                      </div>
                    ) : (
                      <p className="empty-msg">Compile successfully to view the AST.</p>
                    )}
                  </div>
                  <div className="engine-split-panel">
                    <h5 style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>Recursive descent trace</h5>
                    {compilationResult?.rd_trace?.length > 0 ? (
                      <ul className="trace-list">
                        {compilationResult.rd_trace.map((step, idx) => (
                          <li key={idx} className={step.startsWith("Enter") ? "trace-enter" : "trace-exit"}>
                            <code>{step}</code>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty-msg">No trace logged.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="engine-section">
                <h4>Parser traces</h4>
                <div className="traces-grid">
                  <div className="trace-panel">
                    <h5>LL(1) stack</h5>
                    {renderTraceTable(compilationResult?.ll1_trace, compilationResult?.ll1_success, "LL(1)")}
                  </div>
                  <div className="trace-panel">
                    <h5>SLR(1) shift-reduce</h5>
                    {renderTraceTable(compilationResult?.lr_trace, compilationResult?.lr_success, "SLR(1)")}
                  </div>
                </div>
              </section>

              {grammarData && (
                <section className="engine-section">
                  <button
                    type="button"
                    className="grammar-toggle"
                    onClick={() => setGrammarExpanded((e) => !e)}
                    aria-expanded={grammarExpanded}
                  >
                    Grammar & parsing tables
                    <span>{grammarExpanded ? "−" : "+"}</span>
                  </button>
                  {grammarExpanded && (
                    <div className="grammar-body">
                      <div className="grammar-rules-grid">
                        {grammarData.rules.map((rule, idx) => (
                          <div className="grammar-rule-card" key={idx}>
                            <code>{rule}</code>
                          </div>
                        ))}
                      </div>

                      <h4 style={{ marginTop: 8 }}>FIRST & FOLLOW</h4>
                      <table className="output-table">
                        <thead>
                          <tr>
                            <th>Non-terminal</th>
                            <th>FIRST</th>
                            <th>FOLLOW</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grammarData.non_terminals
                            .filter((nt) => nt !== "Program'")
                            .map((nt) => (
                              <tr key={nt}>
                                <td>
                                  <strong>{nt}</strong>
                                </td>
                                <td>
                                  <code>{`{ ${grammarData.first[nt]?.join(", ") || ""} }`}</code>
                                </td>
                                <td>
                                  <code>{`{ ${grammarData.follow[nt]?.join(", ") || ""} }`}</code>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>

                      <h4 style={{ marginTop: 24 }}>LL(1) table</h4>
                      <div className="table-responsive">
                        <table className="parsing-table matrix">
                          <thead>
                            <tr>
                              <th>NT</th>
                              {grammarData.terminals.map((t) => (
                                <th key={t}>{t}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grammarData.non_terminals
                              .filter((nt) => nt !== "Program'")
                              .map((nt) => (
                                <tr key={nt}>
                                  <td>
                                    <strong>{nt}</strong>
                                  </td>
                                  {grammarData.terminals.map((t) => {
                                    const val = grammarData.ll1_table[nt]?.[t];
                                    return (
                                      <td key={t} className={val ? "filled-cell" : ""}>
                                        {val || ""}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      <h4 style={{ marginTop: 24 }}>SLR action table</h4>
                      <div className="table-responsive">
                        <table className="parsing-table matrix">
                          <thead>
                            <tr>
                              <th>State</th>
                              {grammarData.terminals.map((t) => (
                                <th key={t}>{t}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(grammarData.lr_table.action).map((state) => (
                              <tr key={state}>
                                <td>
                                  <strong>{state}</strong>
                                </td>
                                {grammarData.terminals.map((t) => {
                                  const val = grammarData.lr_table.action[state]?.[t];
                                  return (
                                    <td key={t} className={val ? `filled-cell ${val[0]}` : ""}>
                                      {val || ""}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <h4 style={{ marginTop: 24 }}>SLR goto table</h4>
                      <div className="table-responsive">
                        <table className="parsing-table matrix">
                          <thead>
                            <tr>
                              <th>State</th>
                              {grammarData.non_terminals
                                .filter((nt) => nt !== "Program'")
                                .map((nt) => (
                                  <th key={nt}>{nt}</th>
                                ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(grammarData.lr_table.goto).map((state) => (
                              <tr key={state}>
                                <td>
                                  <strong>{state}</strong>
                                </td>
                                {grammarData.non_terminals
                                  .filter((nt) => nt !== "Program'")
                                  .map((nt) => {
                                    const val = grammarData.lr_table.goto[state]?.[nt];
                                    return (
                                      <td key={nt} className={val ? "filled-cell goto" : ""}>
                                        {val || ""}
                                      </td>
                                    );
                                  })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {workspaceMode === "console" && (
            <div key="console" className="mode-panel console-mode">
              <h4>Compilation output</h4>
              {error && <div className="panel-alert error">{error}</div>}

              {compilationResult && (
                <div className={`console-banner ${compilationResult.success ? "success" : "error"}`}>
                  <strong>Summary · </strong>
                  {compilationResult.success
                    ? "Compilation succeeded with no errors."
                    : `${errorCount} diagnostic${errorCount === 1 ? "" : "s"} reported.`}
                </div>
              )}

              {compilationResult?.errors?.length > 0 ? (
                <div className="error-logs-list">
                  {compilationResult.errors.map((err, i) => (
                    <div className={`error-log-card ${err.type}`} key={i}>
                      <div className="err-meta">
                        <span>{err.type} error</span>
                        <span>
                          Line {err.line}, col {err.column}
                        </span>
                      </div>
                      <div className="err-desc">{err.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-msg success-tone">No errors detected.</p>
              )}

              {!compilationResult?.success && compilationResult && (
                <div className="recovery-details-card">
                  <h5>Parser recovery</h5>
                  <ul>
                    {compilationResult.ll1_errors?.map((e, idx) => (
                      <li key={`ll-${idx}`}>
                        LL(1): mismatch at line {e.line}, synchronized to FOLLOW set.
                      </li>
                    ))}
                    {compilationResult.lr_errors?.map((e, idx) => (
                      <li key={`lr-${idx}`}>
                        SLR(1): stack recovery with safe non-terminals and lookahead sync.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </main>
        {dashboardLaunching && (
          <CompilerLoader
            overlay
            mark="pascal"
            label="Loading Pascal workspace"
          />
        )}
        {!dashboardLaunching && loading && (
          <CompilerLoader
            overlay
            label="Compiling Pascal source"
            stages={["Lexing tokens", "Parsing grammar", "Checking semantics", "Building AST"]}
          />
        )}
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)} role="presentation">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="settings-title">
            <div className="modal-header">
              <h3 id="settings-title">Settings</h3>
              <button type="button" className="modal-close" onClick={() => setShowSettings(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-name">Strict syntax parsing</span>
                  <span className="setting-desc">Stop parsing on the first lexical or syntax deviation.</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={strictParser} onChange={(e) => setStrictParser(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-name">Lexer optimization</span>
                  <span className="setting-desc">Token lookahead caching (UI preview only).</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={lexerOptimizer} onChange={(e) => setLexerOptimizer(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="setting-row slider-row">
                <div className="setting-info">
                  <span className="setting-name">
                    Debug trace level · <strong>{debugLogLevel}</strong>
                  </span>
                  <span className="setting-desc">Depth of parser stack dumps in traces.</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={debugLogLevel}
                  onChange={(e) => setDebugLogLevel(parseInt(e.target.value, 10))}
                  className="range-slider"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary-modal" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
