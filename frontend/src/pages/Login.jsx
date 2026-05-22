import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "./Login.css";

const SAMPLE_CODE_LINES = [
  { type: "keyword", text: "program FactorialProg;" },
  { type: "comment", text: "{ factorial demo }" },
  { type: "token", text: "var n, i, fact : integer;" },
  { type: "keyword", text: "begin" },
  { type: "statement", text: "  n := 5;" },
  { type: "statement", text: "  fact := 1;" },
  { type: "statement", text: "  i := 1;" },
  { type: "statement", text: "  while i <= n do" },
  { type: "block", text: "  begin" },
  { type: "statement", text: "    fact := fact * i;" },
  { type: "statement", text: "    i := i + 1;" },
  { type: "block", text: "  end;" },
  { type: "keyword", text: "  writeln(fact);" },
  { type: "keyword", text: "end." },
];

const BINARY_COLUMNS = 28;
const BINARY_ROWS = 36;

function buildBinaryColumn(col) {
  const half = Array.from({ length: BINARY_ROWS }, (_, row) =>
    (col * 17 + row * 31) % 2 === 0 ? "0" : "1"
  );
  return [...half, ...half];
}

function BinaryRainBackground() {
  return (
    <div className="binary-bg" aria-hidden="true">
      {Array.from({ length: BINARY_COLUMNS }, (_, col) => (
        <div
          key={col}
          className={`binary-column ${col % 2 === 0 ? "binary-column--down" : "binary-column--up"}`}
          style={{
            "--binary-duration": `${40 + (col % 6) * 6}s`,
            "--binary-delay": `${-col * 4}s`,
            "--bit-alpha": `${0.1 + (col % 5) * 0.04}`,
          }}
        >
          <div className="binary-stream">
            {buildBinaryColumn(col).map((bit, i) => (
              <span key={i} className="binary-bit">
                {bit}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeScrollPreview() {
  const lines = [...SAMPLE_CODE_LINES, ...SAMPLE_CODE_LINES];

  return (
    <div className="aside-code" aria-hidden="true">
      <div className="code-scroll-fade code-scroll-fade--top" />
      <div className="code-scroll-fade code-scroll-fade--bottom" />
      <div className="code-scroll-viewport">
        <div className="code-scroll-track">
          {lines.map((line, i) => (
            <div key={i} className={`code-line code-line--${line.type}`}>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (api.isAuthenticated()) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await api.register(username, password);
        setSuccess("Account created. You can sign in now.");
        setIsRegister(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        await api.login(username, password);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="login-container">
      <BinaryRainBackground />
      <div className="login-layout">
        <aside className="login-aside">
          <div className="aside-inner">
            <p className="aside-label">Compiler construction</p>
            <h1 className="aside-title">Pascal compiler</h1>
            <p className="aside-desc">
              Lexical analysis, parsing, and semantic checks for a Pascal subset — presented with clarity.
            </p>
            <CodeScrollPreview />
          </div>
        </aside>

        <div className="login-card">
          <div className="login-header">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h2>{isRegister ? "Create account" : "Sign in"}</h2>
            <p className="subtitle">CS-471L · Compiler construction lab</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert error" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="auth-alert success" role="status">
                {success}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            {isRegister && (
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Please wait…" : isRegister ? "Create account" : "Continue"}
            </button>
          </form>

          <div className="login-footer">
            <p>
              {isRegister ? "Already have an account?" : "New here?"}{" "}
              <button type="button" className="link-btn" onClick={toggleMode}>
                {isRegister ? "Sign in" : "Register"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
