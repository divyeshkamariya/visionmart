/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  SESSION_EXPIRED_EVENT,
  TOKEN_KEY,
  USER_KEY,
} from "../utils/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(readStoredUser);
  const [checking, setChecking] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY))
  );

  // On first load, confirm the saved token with the server.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return undefined;

    let active = true;

    apiRequest("/auth/me")
      .then((data) => {
        if (!active) return;

        const currentUser = data.user ?? data;
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        // A 401 is handled in apiRequest (it clears storage and fires the
        // session-expired event). For network errors we keep the saved user.
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Auto logout when the API reports an expired/invalid token,
  // and keep multiple browser tabs in sync.
  useEffect(() => {
    function handleExpired() {
      setUser(null);
      navigate("/login", {
        replace: true,
        state: { from: window.location.pathname, expired: true },
      });
    }

    function handleStorage(event) {
      if (event.key === null || event.key === TOKEN_KEY || event.key === USER_KEY) {
        setUser(readStoredUser());
      }
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
      window.removeEventListener("storage", handleStorage);
    };
  }, [navigate]);

  const login = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      checking,
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === "admin",
      login,
      logout,
    }),
    [user, checking, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }

  return context;
}
