

## Add Show Password Toggle to Login Page

**File:** `src/pages/Auth.tsx`

### Changes
1. Add a `showPassword` state boolean
2. Replace `type="password"` with `type={showPassword ? "text" : "password"}` on all three password inputs (sign-in, sign-up, and keep forgot-password as-is since it has no password field)
3. Add a checkbox with label "Show password" below each password input using the existing Checkbox component from `@/components/ui/checkbox`

Single-file edit, no new dependencies.

