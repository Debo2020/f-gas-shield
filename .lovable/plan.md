

# Fix: Addon Checkout Stripe Redirect

## Problem
The addon checkout button on the Pricing page uses `window.location.href = data.url` to redirect to Stripe. This fails because:
1. In the Lovable preview iframe, Stripe blocks iframe embedding
2. Even outside the iframe, navigating away loses the app state

The main subscription checkout already works correctly by using `window.open(data.url, "_blank")` in `useSubscription.tsx`.

## Fix
In `src/pages/Pricing.tsx` line 367, change:
```typescript
// Before
if (data?.url) window.location.href = data.url;

// After  
if (data?.url) window.open(data.url, "_blank");
```

This matches the pattern used by the main subscription checkout and ensures Stripe opens in a new tab.

## Files to Modify
| File | Change |
|---|---|
| `src/pages/Pricing.tsx` | Change `window.location.href` to `window.open(url, "_blank")` on line 367 |
| `src/components/landing/PricingSection.tsx` | Same fix if addon checkout exists there (verify) |

One-line fix, no other changes needed.

