// frontend/src/services/api.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const getHeaders = (isMultipart = false) => {
  const headers = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async register(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Registration failed");
    }
    return res.json();
  },

  async login(username, password) {
    // OAuth2PasswordRequestForm expects form-urlencoded body
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(true),
      body: params,
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Incorrect username or password");
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("username", username);
    return data;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  },

  isAuthenticated() {
    return !!localStorage.getItem("token");
  },

  getUsername() {
    return localStorage.getItem("username") || "Guest";
  },

  async getGrammar() {
    const res = await fetch(`${API_BASE_URL}/compiler/grammar`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch grammar attributes");
    }
    return res.json();
  },

  async compile(code) {
    const res = await fetch(`${API_BASE_URL}/compiler/compile`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Compilation request failed");
    }
    return res.json();
  },
};
