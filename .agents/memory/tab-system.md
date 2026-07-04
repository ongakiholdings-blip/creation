---
name: Tab system pattern
description: How to correctly add a new tab to the main page tab strip.
---

## 4 places to update when adding a tab

1. **`src/constants/bot-contents.ts`** — add key to `DBOT_TABS` and its id string to `TAB_IDS` (order must match).
2. **`src/stores/root-store.ts`** — import and instantiate the new store, add to class properties.
3. **`src/pages/main/main.tsx`**:
   - Add hash string to the `hash` array (index must match `DBOT_TABS`).
   - Import the page component.
   - Import the icon from `@deriv/quill-icons/LabelPaired`.
   - Add a `<div label={...} id='id-your-tab'>` block inside `<Tabs>`.
   - Update the right shadow sentinel (`getElementById`) to point to the new last tab's id.
4. **New page** in `src/pages/<name>/index.tsx` + `.scss`.

**Why:** Missing any one of these four produces either a broken hash navigation, a missing store, or a wrong tab index — all of which fail silently.
