

## Add Eye Icon Password Toggle to Sign In & Sign Up

The auth page already has a `showPassword` state and a checkbox toggle. The change is to replace the checkbox with an inline eye/eye-slash icon button inside the password input (matching the pattern already used in `ResetPassword.tsx`).

### Single file change: `src/pages/Auth.tsx`

**Sign In password field (lines 363-380):**
- Wrap `Input` in a `relative` div
- Add `pr-10` class to the Input
- Add an absolutely-positioned button with `Eye`/`EyeOff` icon (from lucide-react, already imported in `ResetPassword.tsx`)
- Remove the Checkbox + Label "Show password" block
- Add `aria-label` for accessibility

**Sign Up password field (lines 428-446):**
- Same inline icon treatment
- Remove the Checkbox + Label block
- Keep the password requirements text below

**Imports:**
- Add `Eye, EyeOff` to the existing lucide-react import (line 12)
- Remove `Checkbox` import (line 13) if no longer used elsewhere

The icon button pattern is identical to what's already in `ResetPassword.tsx`:
```tsx
<div className="relative">
  <Input ... className="pr-10" />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
```

