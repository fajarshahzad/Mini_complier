// frontend/src/pages/Login.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "./Login.css";

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  
  const navigate = useNavigate();

  // Redirect if already authenticated
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
        setSuccess("Registration successful! You can now log in.");
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
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <h1>Pascal Mini Compiler</h1>
          <p className="subtitle">CS-471L Compiler Construction Lab</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="auth-alert error">{error}</div>}
          {success && <div className="auth-alert success">{success}</div>}

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {isRegister && (
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Sign Up" : "Login"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button className="toggle-btn" onClick={toggleMode}>
              {isRegister ? "Log In" : "Register"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;