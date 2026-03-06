

# Add Client Filter Dropdown to Sites Page

## Changes

### File: `src/pages/Sites.tsx`

1. Add a `clientFilter` state (default: `"all"`)
2. Fetch distinct clients from the loaded sites data
3. Add a `Select` dropdown next to the search input, populated with client names
4. Update `filteredSites` to also filter by selected client (matching `client?.id`)

The dropdown will show "All Clients" plus each unique client name found in the sites data. Selecting a client filters the grid; selecting "All Clients" resets it.

No database or backend changes needed -- filtering is purely client-side on already-fetched data.

