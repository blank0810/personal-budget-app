# Community Requests Improvements

**Date:** 2026-04-03
**Status:** Approved

## Problems

1. Completed feature requests render as an unconstrained card grid. As completed requests grow, the page bloats indefinitely.
2. The feedback/feature-request form is hard to find -- only accessible via the changelog page header or footer link.

## Solution

### 1. Sidebar: Rename "Changelog" to "Community"

- Rename the existing sidebar nav item from "Changelog" to "Community"
- Add tooltip: "Community Changelog & Feedback"
- Keep link to `/changelog`
- Keep existing Sparkles icon and new-changelog indicator dot

**File:** `components/common/app-sidebar.tsx`

### 2. Completed Requests: Card Grid to Data Table

Replace the card grid in the "Completed" tab of `FeatureRequestTabs.tsx` with a paginated data table.

**Columns:**
- Title
- Category (badge with icon, same styling as current cards)
- Completed Date (formatted "Month Day, Year")

**Behavior:**
- 10 rows per page
- Default sort: completed date descending (newest first)
- Open Requests tab keeps the current card grid layout

**File:** `components/modules/feature-request/FeatureRequestTabs.tsx`
