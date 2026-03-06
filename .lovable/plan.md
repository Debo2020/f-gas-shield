

# Fix: Subscribe Button in Organisation Add-ons Tab

## Problem
The "Subscribe to Add-on" button in `OrganisationAddonsTab.tsx` (line 312) simply navigates to `/pricing` instead of directly initiating the Stripe checkout session.

## Fix
Replace `navigate("/pricing")` with the same inline Stripe checkout logic used on the Pricing page -- invoke `create-addon-checkout` and open the returned URL in a new tab.

### Changes in `src/components/organisation/OrganisationAddonsTab.tsx`

1. Add `addonLoading` state variable
2. Replace the simple navigate button (lines 310-315) with:

```tsx
{!companyHasAddon && (
  <div className="pt-2">
    <Button
      disabled={addonLoading}
      onClick={async () => {
        setAddonLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke("create-addon-checkout", {
            body: { priceId: ADDON_MODULES.natural_gas.price_id, quantity: 1 },
          });
          if (error) throw error;
          if (data?.url) window.open(data.url, "_blank");
        } catch {
          toast.error("Failed to start add-on checkout");
        } finally {
          setAddonLoading(false);
        }
      }}
    >
      {addonLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flame className="h-4 w-4 mr-2" />}
      Subscribe to Add-on
    </Button>
  </div>
)}
```

### Files to Modify
| File | Change |
|---|---|
| `src/components/organisation/OrganisationAddonsTab.tsx` | Replace navigate("/pricing") with direct Stripe checkout invocation, add `addonLoading` state |

Single-file, minimal change.

