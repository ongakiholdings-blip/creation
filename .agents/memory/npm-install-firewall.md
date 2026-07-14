---
name: npm install firewall fix
description: Fresh npm install on this project (FROSTYDBOT / Deriv trading bot) can fail with a Package Firewall 405 fetching npm-10.9.8.tgz directly, even though it's a bundled transitive dependency.
---

`npm install` sometimes tries to fetch `npm@10.9.8` directly from the registry (via `@deriv-com/quill-ui` → `@deriv-com/quill-tokens` → `semantic-release`), which the Replit Package Firewall blocks with a 405, even though the lockfile correctly marks it as a `bundleDependencies` entry (bundled inside its parent tarball).

**Why:** This appears to recur each time `package-lock.json` gets regenerated/imported in a way that loses the bundled-dependency resolution npm needs to avoid a direct fetch.

**How to apply:** If `npm install` fails with `405 Method Not Allowed ... npm-10.9.8.tgz`, delete `package-lock.json` and `node_modules`, then run `npm install` again to regenerate the lockfile with correct bundling. Don't try to patch the lockfile by hand.
