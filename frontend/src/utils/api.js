const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const TOKEN_KEY = "visionmart-token";
export const USER_KEY = "visionmart-user";

// Fired when the server says our token is no longer valid (expired/deleted user).
export const SESSION_EXPIRED_EVENT = "visionmart-session-expired";

// A 401 from these endpoints means "wrong password", not "session expired".
const AUTH_PATHS = ["/auth/login", "/auth/register"];

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Auto logout: token expired or invalid.
    if (response.status === 401 && token && !AUTH_PATHS.includes(path)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    throw error;
  }

  return data;
}
