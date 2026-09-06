"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ACADEMY_API_URL, hasSessionHint, type AcademyUser } from "@/lib/academy-api";

/**
 * Holds the signed-in session for the course view.
 *
 * The access token lives in a ref, not state — it changes on every refresh and
 * nothing renders from it, so keeping it in state would re-render the whole
 * tree for no reason. The long-lived half of the session is an httpOnly cookie
 * the browser sends on its own; nothing sensitive is stored where a script can
 * read it.
 */

type Status = "loading" | "anon" | "authed";

type AuthContextValue = {
  status: Status;
  user: AcademyUser | null;
  /** Fetch against the course API with the bearer token attached, retrying
   *  once through a refresh if the token has aged out mid-session. */
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  requestCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  redeemHandoff: (token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setUser: (user: AcademyUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionResponse = { accessToken?: string; user?: AcademyUser; error?: string };

export function AcademyAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<AcademyUser | null>(null);
  const tokenRef = useRef<string | null>(null);

  const adopt = useCallback((data: SessionResponse): boolean => {
    if (!data.accessToken || !data.user) return false;
    tokenRef.current = data.accessToken;
    setUserState(data.user);
    setStatus("authed");
    return true;
  }, []);

  const forget = useCallback(() => {
    tokenRef.current = null;
    setUserState(null);
    setStatus("anon");
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${ACADEMY_API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      return adopt((await res.json()) as SessionResponse);
    } catch {
      return false;
    }
  }, [adopt]);

  // Only reaches for a session when the hint cookie says there might be one,
  // so an anonymous visitor to the marketing site never pays for a request.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = hasSessionHint() ? await refresh() : false;
      if (cancelled || restored) return;
      forget();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, forget]);

  const apiFetch = useCallback<AuthContextValue["apiFetch"]>(
    async (path, init = {}) => {
      const send = () => {
        const headers = new Headers(init.headers);
        if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
        return fetch(`${ACADEMY_API_URL}${path}`, { ...init, headers, credentials: "include" });
      };

      const response = await send();
      // A 15-minute access token will expire mid-session on a page someone
      // leaves open; one silent refresh is nicer than an unexplained bounce.
      if (response.status !== 401 || !tokenRef.current) return response;
      return (await refresh()) ? send() : response;
    },
    [refresh],
  );

  const requestCode = useCallback<AuthContextValue["requestCode"]>(async (email) => {
    try {
      const res = await fetch(`${ACADEMY_API_URL}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: data?.error ?? "Could not send the code. Try again." };
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Check your connection." };
    }
  }, []);

  const verifyCode = useCallback<AuthContextValue["verifyCode"]>(
    async (email, code) => {
      try {
        const res = await fetch(`${ACADEMY_API_URL}/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
          credentials: "include",
        });
        const data = (await res.json().catch(() => null)) as SessionResponse | null;
        if (!res.ok || !data) return { ok: false, error: data?.error ?? "That didn't work. Try again." };
        return adopt(data) ? { ok: true } : { ok: false, error: "Could not complete sign-in." };
      } catch {
        return { ok: false, error: "Could not reach the server. Check your connection." };
      }
    },
    [adopt],
  );

  const redeemHandoff = useCallback<AuthContextValue["redeemHandoff"]>(
    async (token) => {
      try {
        const res = await fetch(`${ACADEMY_API_URL}/auth/handoff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "include",
        });
        if (!res.ok) return false;
        return adopt((await res.json()) as SessionResponse);
      } catch {
        return false;
      }
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch(`${ACADEMY_API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // Signing out locally matters more than the server confirming it.
    }
    forget();
  }, [forget]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, apiFetch, requestCode, verifyCode, redeemHandoff, signOut, setUser: setUserState }),
    [status, user, apiFetch, requestCode, verifyCode, redeemHandoff, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAcademyAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAcademyAuth must be used inside <AcademyAuthProvider>");
  return value;
}
