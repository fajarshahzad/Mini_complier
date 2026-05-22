// frontend/src/pages/Dashboard.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
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
end.`
};

function Dashboard() {
  const [code, setCode] = useState(SAMPLES.factorial);
  const [activeTab, setActiveTab] = useState("lexer");
  const [username, setUsername] = useState("Guest");
  const [grammarData, setGrammarData] = useState(null);
  const [compilationResult, setCompilationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  // Load username and initial grammar details
  useEffect(() => {
    if (!api.isAuthenticated()) {
      navigate("/");
      return;
    }
    setUsername(api.getUsername());
    
    // Fetch Grammar info
    api.getGrammar()
      .then((data) => setGrammarData(data))
      .catch((err) => setError("Failed to fetch grammar info: " + err.message));
      
    // Initial compile on load
    handleCompile();
  }, [navigate]);

  const handleLogout = () => {
    api.logout();
    navigate("/");
  };

  const handleCompile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.compile(code);
      setCompilationResult(res);
      // Auto-switch to error console if compilation contains errors
      if (res.errors && res.errors.length > 0) {
        setActiveTab("console");
      }
    } catch (err) {
      setError(err.message || "Compilation request failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (type) => {
    setCode(SAMPLES[type]);
  };

  // Render tree node recursive helper
  const renderASTNode = (node) => {
    if (!node) return null;
    return (
      <div className="ast-tree-node" key={Math.random()}>
        <div className={`node-badge ${node.node_type}`}>
          <strong>{node.node_type}</strong>
          {node.name && <span className="node-val"> ({node.name})</span>}
          {node.value && <span className="node-val"> = {node.value}</span>}
          {node.variable && <span className="node-val"> (Var: {node.variable})</span>}
          {node.type && <span className="node-val"> [Type: {node.type}]</span>}
          {node.op && <span className="node-val"> [Op: {node.op}]</span>}
          {node.variables && <span className="node-val"> (Vars: {node.variables.join(", ")})</span>}
        </div>
        {((node.children && node.children.length > 0) || node.condition || node.then || node.else || node.left || node.right || node.expression || node.body) && (
          <div className="node-children">
            {node.children && node.children.map(renderASTNode)}
            {node.condition && (
              <div className="ast-child-wrapper">
                <span className="edge-label">condition:</span>
                {renderASTNode(node.condition)}
              </div>
            )}
            {node.then && (
              <div className="ast-child-wrapper">
                <span className="edge-label">then:</span>
                {renderASTNode(node.then)}
              </div>
            )}
            {node.else && (
              <div className="ast-child-wrapper">
                <span className="edge-label">else:</span>
                {renderASTNode(node.else)}
              </div>
            )}
            {node.body && (
              <div className="ast-child-wrapper">
                <span className="edge-label">body:</span>
                {renderASTNode(node.body)}
              </div>
            )}
            {node.left && (
              <div className="ast-child-wrapper">
                <span className="edge-label">left:</span>
                {renderASTNode(node.left)}
              </div>
            )}
            {node.right && (
              <div className="ast-child-wrapper">
                <span className="edge-label">right:</span>
                {renderASTNode(node.right)}
              </div>
            )}
            {node.expression && (
              <div className="ast-child-wrapper">
                <span className="edge-label">expr:</span>
                {renderASTNode(node.expression)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Header Bar */}
      <header className="main-header">
        <div className="header-left">
          <div className="header-logo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            <span>Pascal IDE Compiler</span>
          </div>
        </div>
        <div className="header-right">
          <span className="user-profile">
            <span className="avatar">{username[0].toUpperCase()}</span>
            {username}
          </span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Main Split Screen */}
      <div className="workspace">
        {/* Left Panel: Editor & Control */}
        <div className="editor-panel">
          <div className="panel-header">
            <h3>Pascal Source Code</h3>
            <div className="editor-controls">
              <select onChange={(e) => loadSample(e.target.value)} defaultValue="factorial">
                <option value="factorial">Sample 1: Factorial (Valid)</option>
                <option value="syntaxError">Sample 2: Syntax Error Recovery</option>
                <option value="semanticError">Sample 3: Semantic Type Errors</option>
              </select>
              <button className="btn-compile" onClick={handleCompile} disabled={loading}>
                {loading ? (
                  "Compiling..."
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Run Compiler
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="code-editor-wrapper">
            <textarea
              className="code-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Type Pascal code here..."
              spellCheck="false"
            />
          </div>
        </div>

        {/* Right Panel: Compiler Output Viewers */}
        <div className="output-panel">
          {/* Tab Navigation */}
          <nav className="tab-nav">
            <button className={activeTab === "lexer" ? "active" : ""} onClick={() => setActiveTab("lexer")}>
              Lexer ({compilationResult?.tokens?.length || 0})
            </button>
            <button className={activeTab === "grammar" ? "active" : ""} onClick={() => setActiveTab("grammar")}>
              Grammar & Tables
            </button>
            <button className={activeTab === "ast" ? "active" : ""} onClick={() => setActiveTab("ast")}>
              AST & RD Parser
            </button>
            <button className={activeTab === "ll1" ? "active" : ""} onClick={() => setActiveTab("ll1")}>
              LL(1) Stack Trace
            </button>
            <button className={activeTab === "lr" ? "active" : ""} onClick={() => setActiveTab("lr")}>
              LR Stack Trace
            </button>
            <button className={activeTab === "symbol" ? "active" : ""} onClick={() => setActiveTab("symbol")}>
              Symbol Table
            </button>
            <button className={activeTab === "console" ? "active" : ""} onClick={() => setActiveTab("console")}>
              Console Logs {compilationResult?.errors?.length > 0 && <span className="badge-err">{compilationResult.errors.length}</span>}
            </button>
          </nav>

          {/* Tab Body */}
          <div className="tab-content">
            {error && <div className="panel-alert error">{error}</div>}

            {/* TAB: LEXER */}
            {activeTab === "lexer" && (
              <div className="scroll-wrapper">
                <h4>Tokens Stream</h4>
                {compilationResult?.tokens && compilationResult.tokens.length > 0 ? (
                  <table className="output-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Token Type</th>
                        <th>Lexeme / Value</th>
                        <th>Line</th>
                        <th>Column</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compilationResult.tokens.map((tok, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><span className={`tok-type ${tok.type}`}>{tok.type}</span></td>
                          <td><code>{tok.value}</code></td>
                          <td>{tok.line}</td>
                          <td>{tok.column}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="empty-msg">No tokens generated yet. Run compilation.</p>
                )}
              </div>
            )}

            {/* TAB: GRAMMAR & TABLES */}
            {activeTab === "grammar" && grammarData && (
              <div className="scroll-wrapper">
                <h4>Pascal Subset BNF Grammar</h4>
                <div className="grammar-rules-grid">
                  {grammarData.rules.map((rule, idx) => (
                    <div className="grammar-rule-card" key={idx}>
                      <code>{rule}</code>
                    </div>
                  ))}
                </div>

                <h4 style={{ marginTop: "24px" }}>FIRST & FOLLOW Sets</h4>
                <table className="output-table">
                  <thead>
                    <tr>
                      <th>Non-Terminal</th>
                      <th>FIRST Set</th>
                      <th>FOLLOW Set</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grammarData.non_terminals.filter(nt => nt !== "Program'").map((nt) => (
                      <tr key={nt}>
                        <td><strong>{nt}</strong></td>
                        <td><code>{`{ ${grammarData.first[nt]?.join(", ") || ""} }`}</code></td>
                        <td><code>{`{ ${grammarData.follow[nt]?.join(", ") || ""} }`}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4 style={{ marginTop: "24px" }}>LL(1) Parsing Table</h4>
                <div className="table-responsive">
                  <table className="parsing-table matrix">
                    <thead>
                      <tr>
                        <th>Non-Terminal</th>
                        {grammarData.terminals.map(t => <th key={t}>{t}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {grammarData.non_terminals.filter(nt => nt !== "Program'").map(nt => (
                        <tr key={nt}>
                          <td><strong>{nt}</strong></td>
                          {grammarData.terminals.map(t => {
                            const val = grammarData.ll1_table[nt]?.[t];
                            return <td key={t} className={val ? "filled-cell" : ""}>{val || ""}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ marginTop: "24px" }}>SLR(1) LR Action Table</h4>
                <div className="table-responsive">
                  <table className="parsing-table matrix action-matrix">
                    <thead>
                      <tr>
                        <th>State</th>
                        {grammarData.terminals.map(t => <th key={t}>{t}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(grammarData.lr_table.action).map(state => (
                        <tr key={state}>
                          <td><strong>{state}</strong></td>
                          {grammarData.terminals.map(t => {
                            const val = grammarData.lr_table.action[state]?.[t];
                            return <td key={t} className={val ? `filled-cell ${val[0]}` : ""}>{val || ""}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ marginTop: "24px" }}>SLR(1) LR Goto Table</h4>
                <div className="table-responsive">
                  <table className="parsing-table matrix goto-matrix">
                    <thead>
                      <tr>
                        <th>State</th>
                        {grammarData.non_terminals.filter(nt => nt !== "Program'").map(nt => <th key={nt}>{nt}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(grammarData.lr_table.goto).map(state => (
                        <tr key={state}>
                          <td><strong>{state}</strong></td>
                          {grammarData.non_terminals.filter(nt => nt !== "Program'").map(nt => {
                            const val = grammarData.lr_table.goto[state]?.[nt];
                            return <td key={nt} className={val ? "filled-cell goto" : ""}>{val || ""}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: AST & RECURSIVE DESCENT */}
            {activeTab === "ast" && (
              <div className="split-tab-grid">
                <div className="scroll-wrapper border-right">
                  <h4>Abstract Syntax Tree (AST)</h4>
                  {compilationResult?.ast ? (
                    <div className="ast-tree-root">
                      {renderASTNode(compilationResult.ast)}
                    </div>
                  ) : (
                    <p className="empty-msg">No AST generated. Make sure code compiles without errors.</p>
                  )}
                </div>
                
                <div className="scroll-wrapper">
                  <h4>Recursive Descent Call Stack Trace</h4>
                  {compilationResult?.rd_trace && compilationResult.rd_trace.length > 0 ? (
                    <ul className="trace-list">
                      {compilationResult.rd_trace.map((trace_step, idx) => (
                        <li key={idx} className={trace_step.startsWith("Enter") ? "trace-enter" : "trace-exit"}>
                          <code>{trace_step}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-msg">No parse call stack logged.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: LL(1) TRACE */}
            {activeTab === "ll1" && (
              <div className="scroll-wrapper">
                <h4>LL(1) Stack Parsing Steps</h4>
                {compilationResult?.ll1_trace && compilationResult.ll1_trace.length > 0 ? (
                  <>
                    <div className="parser-success-indicator">
                      Status:{" "}
                      {compilationResult.ll1_success ? (
                        <span className="success-badge">LL(1) Parsing Succeeded</span>
                      ) : (
                        <span className="error-badge">LL(1) Parser Failed / Recovered</span>
                      )}
                    </div>
                    <table className="output-table font-mono">
                      <thead>
                        <tr>
                          <th>Step</th>
                          <th>Stack Contents</th>
                          <th>Remaining Input</th>
                          <th>Parser Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compilationResult.ll1_trace.map((step, idx) => (
                          <tr key={idx} className={step.action.includes("Error") ? "error-row" : ""}>
                            <td>{idx + 1}</td>
                            <td className="stack-td"><code>{step.stack}</code></td>
                            <td className="input-td"><code>{step.input}</code></td>
                            <td>
                              <span className={`action-badge ${step.action.startsWith("Apply") ? "apply" : step.action.startsWith("Match") ? "match" : "err"}`}>
                                {step.action}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="empty-msg">No parser execution trace. Run compilation.</p>
                )}
              </div>
            )}

            {/* TAB: LR TRACE */}
            {activeTab === "lr" && (
              <div className="scroll-wrapper">
                <h4>SLR(1) Shift-Reduce Parsing Steps</h4>
                {compilationResult?.lr_trace && compilationResult.lr_trace.length > 0 ? (
                  <>
                    <div className="parser-success-indicator">
                      Status:{" "}
                      {compilationResult.lr_success ? (
                        <span className="success-badge">LR Parsing Succeeded</span>
                      ) : (
                        <span className="error-badge">LR Parser Failed / Recovered</span>
                      )}
                    </div>
                    <table className="output-table font-mono">
                      <thead>
                        <tr>
                          <th>Step</th>
                          <th>State Stack</th>
                          <th>Symbol Stack</th>
                          <th>Remaining Input</th>
                          <th>Action Taken</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compilationResult.lr_trace.map((step, idx) => (
                          <tr key={idx} className={step.action.includes("Error") ? "error-row" : ""}>
                            <td>{idx + 1}</td>
                            <td><code>{step.states}</code></td>
                            <td><code>{step.symbols}</code></td>
                            <td className="input-td"><code>{step.input}</code></td>
                            <td>
                              <span className={`action-badge ${step.action.startsWith("Shift") ? "match" : step.action.startsWith("Reduce") ? "apply" : "err"}`}>
                                {step.action}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="empty-msg">No LR parser execution trace. Run compilation.</p>
                )}
              </div>
            )}

            {/* TAB: SYMBOL TABLE */}
            {activeTab === "symbol" && (
              <div className="scroll-wrapper">
                <h4>Active Nested Scopes Symbol Table</h4>
                {compilationResult?.symbol && compilationResult.symbol.length === 0 ? (
                  <p className="empty-msg">Symbol table is empty.</p>
                ) : compilationResult?.symbol_table ? (
                  <div className="scopes-tree-wrapper">
                    {compilationResult.symbol_table.map((scope) => (
                      <div className="scope-block-card" key={scope.scope_id} style={{ marginLeft: `${scope.scope_id * 24}px` }}>
                        <div className="scope-card-header">
                          <strong>Scope {scope.scope_id}: <code>{scope.scope_name}</code></strong>
                          {scope.parent_id !== null && <span className="parent-scope-label">Parent: Scope {scope.parent_id}</span>}
                        </div>
                        {Object.keys(scope.entries).length > 0 ? (
                          <table className="output-table mini-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Kind</th>
                                <th>Type</th>
                                <th>Scope Lvl</th>
                                <th>Line Declared</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(scope.entries).map((sym, i) => (
                                <tr key={i}>
                                  <td><strong><code>{sym.name}</code></strong></td>
                                  <td><span className="badge-kind">{sym.kind}</span></td>
                                  <td><span className="badge-type">{sym.type}</span></td>
                                  <td>{sym.scope_level}</td>
                                  <td>Line {sym.line}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="empty-scope-msg">No symbols declared in this scope.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-msg">No symbol table data available. Run compilation.</p>
                )}
              </div>
            )}

            {/* TAB: ERROR CONSOLE LOGS */}
            {activeTab === "console" && (
              <div className="scroll-wrapper">
                <h4>Compiler Console Output</h4>
                
                {compilationResult && (
                  <div className={`console-banner ${compilationResult.success ? "success" : "error"}`}>
                    <strong>Compilation Summary:</strong>{" "}
                    {compilationResult.success
                      ? "Success! Source code matches the Pascal grammar with no errors."
                      : `Failed with ${compilationResult.errors?.length || 0} diagnostic error(s).`}
                  </div>
                )}

                {compilationResult?.errors && compilationResult.errors.length > 0 ? (
                  <div className="error-logs-list">
                    {compilationResult.errors.map((err, i) => (
                      <div className={`error-log-card ${err.type}`} key={i}>
                        <div className="err-meta">
                          <span className="err-badge-type">{err.type} Error</span>
                          <span className="err-pos">Line {err.line}, Col {err.column}</span>
                        </div>
                        <div className="err-desc">{err.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-msg green">Console is clear. No compilation errors detected!</p>
                )}
                
                {/* Specific Parser Recovery Notes */}
                {!compilationResult?.success && compilationResult && (
                  <div className="recovery-details-card">
                    <h5>Parser Error Recovery Logs</h5>
                    <ul>
                      {compilationResult.ll1_errors && compilationResult.ll1_errors.map((e, idx) => (
                        <li key={idx}>
                          <strong>LL(1) Panic-Mode Recovery:</strong> Caught mismatch at Line {e.line}, skipped tokens to synchronizing FOLLOW set.
                        </li>
                      ))}
                      {compilationResult.lr_errors && compilationResult.lr_errors.map((e, idx) => (
                        <li key={idx}>
                          <strong>SLR(1) Table-Driven Recovery:</strong> Enriched state stack with safe non-terminals, synchronized lookahead tokens.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;