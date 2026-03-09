

# Upgrade Dexie Package

**Current version**: `dexie@^4.0.10` (with `dexie-react-hooks@^1.1.7`)

**Issue**: The `declare module Dexie` syntax in `dexie.d.ts` triggers TS1540 under TypeScript 5.8+.

**Plan**:
1. Update `package.json` to bump `dexie` to `^4.0.11` (latest stable, which includes type declaration fixes) and `dexie-react-hooks` to `^1.1.7` (already latest).
2. No code changes needed — the API surface is identical.

| File | Change |
|------|--------|
| `package.json` | Bump `dexie` version to `^4.0.11` |

