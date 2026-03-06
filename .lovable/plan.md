

# Rename "Add-ons" Tab to "Licenses" with Unified Subscription Overview

## What Changes

Rename the Organisation "Add-ons" tab to "Licenses" and restructure it to show:
1. **Main subscription summary card** -- current plan tier, status, license count, renewal date, and a "Manage Subscription" button (opens Stripe portal)
2. **Natural Gas add-on section** -- kept as-is below the main subscription card, with the subscribe/license management functionality

## Files to Modify

### 1. `src/pages/Organisation.tsx`
- Change tab config: `id: "addons"` stays the same internally, but change `label: "Add-ons"` to `"Licenses"` and icon from `Flame` to a `KeyRound` or `ShieldCheck` icon

### 2. `src/components/organisation/OrganisationAddonsTab.tsx`
- Update header from "Add-on Modules" to "Licenses & Subscriptions"
- Add a **Main Subscription Card** at the top that:
  - Uses `useSubscription()` to fetch current plan info (tier, status, license count, licenses used, renewal date)
  - Displays plan name, status badge, license usage (e.g. "3 / 5 licenses used"), renewal date
  - Includes "Manage Subscription" button that calls `openCustomerPortal()`
- Keep the existing Natural Gas add-on card and license management table below, under a "Add-on Modules" sub-heading

### Data Sources
- Main subscription: `useSubscription()` hook (already exists, provides `tier`, `subscribed`, `licenseCount`, `licensesUsed`, `subscriptionEnd`)
- Tier display info: `SUBSCRIPTION_TIERS` from `src/lib/subscription.ts`
- Gas addon: existing `useGasAddon()` hook (no changes)

### UI Structure
```text
Licenses & Subscriptions
  |
  +-- [Main Subscription Card]
  |     Plan: Premium (Active)
  |     Licenses: 3 / 5 used
  |     Renews: 15 Jul 2026
  |     [Manage Subscription] button
  |
  +-- Add-on Modules (sub-heading)
  |
  +-- [Natural Gas Card] (existing, unchanged)
  +-- [Gas License Stats] (existing, unchanged)
  +-- [Gas License Table] (existing, unchanged)
```

No database changes required. No new edge functions needed.

