---
name: Zod resolver compatibility
description: A workspace dependency-resolution lesson for React Hook Form and Zod schemas.
---

When a workspace app and `@hookform/resolvers` resolve different Zod major-version declarations, schemas can be runtime-compatible but fail TypeScript structural checks at the resolver boundary.

**Why:** pnpm's workspace-level dependency graph can expose a resolver's Zod types from a different package instance than the app's direct Zod import.

**How to apply:** Prefer aligning the Zod and resolver versions when practical. If the versions are intentionally shared across packages and the runtime API is unchanged, isolate the compatibility cast at the `zodResolver(schema)` boundary rather than weakening form values or schema definitions throughout the page.