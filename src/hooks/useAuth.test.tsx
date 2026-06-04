/**
 * Smoke test: AuthProvider initializes, exposes context, and signs out.
 * Mocks Supabase client to avoid network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const signOutMock = vi.fn().mockResolvedValue({ error: null });
const onAuthStateChangeMock = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));
const getSessionMock = vi.fn().mockResolvedValue({ data: { session: null } });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: onAuthStateChangeMock,
      getSession: getSessionMock,
      signOut: signOutMock,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/offline-db", () => ({
  offlineDb: { profiles: { get: vi.fn(), put: vi.fn() } },
  hashCredentials: vi.fn().mockResolvedValue("hashed"),
}));
vi.mock("@/lib/offline-crypto", () => ({
  encryptData: vi.fn().mockResolvedValue("enc"),
  decryptData: vi.fn().mockResolvedValue("dec"),
}));
vi.mock("@/lib/sync-service", () => ({
  cacheCompanyData: vi.fn().mockResolvedValue(undefined),
}));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

function Probe() {
  const { user, isLoading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <button onClick={() => signOut()}>sign-out</button>
    </div>
  );
}

describe("AuthProvider smoke", () => {
  beforeEach(() => {
    signOutMock.mockClear();
  });

  it("renders children and exposes unauthenticated state", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("ready")
    );
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(onAuthStateChangeMock).toHaveBeenCalled();
  });

  it("invokes supabase signOut", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("ready")
    );
    await act(async () => {
      screen.getByText("sign-out").click();
    });
    expect(signOutMock).toHaveBeenCalled();
  });
});
