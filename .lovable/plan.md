

# Add Cost Summary Footer to Licenses Section

## What to build

A summary card below the licenses table showing a monthly cost breakdown:
- Base license cost: count x per-user price (based on current tier)
- Gas add-on cost: count x £15/user/month
- Total monthly cost

## Implementation

**File: `src/components/organisation/OrganisationLicensesTab.tsx`**

Add a new `Card` after the licenses table card (after line 643), before the dialogs section. It will:

1. Use the existing `useSubscription` hook's `tier` to look up the per-user price from `SUBSCRIPTION_TIERS`
2. Count gas addon licenses from the existing `gasAddonUserIds` set
3. Calculate and display:

```text
+----------------------------------------------+
| Monthly Cost Summary                         |
|----------------------------------------------|
| Base Licenses    5 x £18/user    =    £90.00 |
| Gas Add-on       2 x £15/user    =    £30.00 |
|----------------------------------------------|
| Total Monthly                         £120.00|
+----------------------------------------------+
```

- Only show if `subscribed` is true and `stats.active > 0`
- Use the subscription `tier` to determine base price; if annual, show the annual per-user price
- Gas add-on row only shown if `companyHasAddon` and `gasAddonUserIds.size > 0`
- Import `Separator` component for the divider line

### Data available (no new fetches needed)
- `tier` from `useSubscription()` -- need to destructure this (currently not used)
- `stats.active` for active license count
- `gasAddonUserIds.size` for gas addon count
- `SUBSCRIPTION_TIERS[tier]` for base price lookup

