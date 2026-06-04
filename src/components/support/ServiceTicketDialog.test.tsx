/**
 * Smoke test: ServiceTicketDialog auth-guard branch.
 * When useAuth returns no user, opening the dialog shows the login prompt.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    roles: [],
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
    }),
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
    functions: { invoke: vi.fn() },
  },
}));

import { ServiceTicketDialog } from "@/components/support/ServiceTicketDialog";

describe("ServiceTicketDialog smoke", () => {
  it("renders trigger and shows login prompt when user is not authenticated", () => {
    render(
      <MemoryRouter>
        <ServiceTicketDialog />
      </MemoryRouter>
    );

    // Default trigger renders a "Raise a Ticket" button
    const trigger = screen.getByRole("button", { name: /raise a ticket/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(
      screen.getByText(/please log in to raise a support ticket/i)
    ).toBeInTheDocument();
  });
});
