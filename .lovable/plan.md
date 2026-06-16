## Goal
Promote the Client Portal capability in the "Everything You Need for F-Gas Compliance" section so prospects see that they can keep their own customers compliant with self-serve visibility into live systems and F-Gas usage.

## Change
In `src/components/landing/FeaturesSection.tsx`, add one new card to the `features` array (slotted after "Carbon Reporting", before the AI Assistant highlight card):

- **Icon:** `Building2` (lucide-react) — represents a client/site building
- **Title:** "Client Portal Access"
- **Description:** "Give your customers their own secure login to view live F-Gas systems, inspection status, and refrigerant usage across their sites — keeping them compliant without the back-and-forth."

No other layout, grid, or styling changes. The existing 3-column responsive grid already accommodates an 8th card cleanly (3 + 3 + 2).

## Out of scope
- No pricing/add-on call-out on the card (Client Portal is a paid add-on, but this section is feature-overview only).
- No changes to the AI Assistant highlight card, hero, or pricing section.
- No new routes, components, or backend changes.
