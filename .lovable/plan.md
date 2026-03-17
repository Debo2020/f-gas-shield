

# Guard Service Ticket Access for Logged-In Users Only

## Problem
The Help page (`/help`) is a public route. The `ServiceTicketDialog` on that page and in the `AppLayout` dropdown are technically accessible, but the dialog depends on `useAuth()` for user data. Non-authenticated users could open the dialog and see empty/broken fields.

## Changes

### 1. Help page: Conditionally show "Raise a Ticket"
**File**: `src/pages/Help.tsx`
- Import `useAuth` and check if the user is authenticated
- If not logged in, hide the ServiceTicketDialog button entirely (or replace it with a prompt to log in first)
- The Help page stays public for FAQ browsing, but the ticket button is gated

### 2. ServiceTicketDialog: Add auth guard
**File**: `src/components/support/ServiceTicketDialog.tsx`
- Add an early check inside the dialog: if no authenticated user, show a message like "Please log in to raise a support ticket" instead of the form
- This is a safety net in case the dialog is triggered from any other context

### 3. AppLayout dropdown (already safe)
The `AppLayout` component is only rendered for authenticated users inside `ProtectedRoute`, so the dropdown menu item is already properly guarded. No change needed.

## Files to Edit
1. `src/pages/Help.tsx` -- conditionally render ticket button based on auth state
2. `src/components/support/ServiceTicketDialog.tsx` -- add auth guard inside dialog content

