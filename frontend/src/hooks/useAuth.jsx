import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cc_token"));
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("cc_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (email, password) => {
    const normalizedEmail = typeof email === "string" ? email.trim() : email;
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    tokenRef.current = data.token;
    setToken(data.token);
    setUser({ email: data.email, role: data.role });
    localStorage.setItem("cc_token", data.token);
    localStorage.setItem("cc_user", JSON.stringify({ email: data.email, role: data.role }));
    return data;
  }, []);

  const logout = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
  }, []);

  const authFetch = useCallback(async (url, options = {}) => {
    const currentToken = tokenRef.current ?? token;
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${currentToken}`,
    };
    // Don't set Content-Type for FormData (browser sets multipart boundary)
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
      ...options,
      headers,
    });
    if (res.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  }, [logout, token]);

  const value = { token, user, login, logout, authFetch, API };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useNextStep() {
  const { authFetch } = useAuth();

  const fetchNextStep = useCallback(async () => {
    const res = await authFetch("/me/next-step");
    if (!res.ok) throw new Error("Failed to fetch next step");
    const data = await res.json();
    return data.step;
  }, [authFetch]);

  return fetchNextStep;
}
