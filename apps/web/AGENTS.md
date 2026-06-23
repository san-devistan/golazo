# Web App Guide

`apps/web` is the TanStack Start web application. It owns routes, loaders, SSR
wiring, server functions, web-only feature composition, Cloudinary media usage,
and client integration with generated backend APIs.

## UI Boundaries

Compose web screens from `@workspace/ui` first. Do not add app-local design
system components, wrappers, or token definitions when the shared UI package can
cover the need.

For shared component changes, token changes, or shadcn work, switch to
`packages/ui/AGENTS.md`. The shadcn skill lives in `packages/ui`, not in this
workspace.

## Skills

Web-local skills live in `apps/web/.agents/skills/<skill>/SKILL.md`. Read only
the narrow skill needed for the task.

### TanStack And React

| Skill                                 | Invoke when                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tanstack-start-best-practices`       | TanStack Start full-stack work: server functions, middleware, SSR, auth/session handling, API routes, deployment  |
| `tanstack-router-best-practices`      | Type-safe routing, route trees, navigation, search params, route context, loaders, not-found, or preload behavior |
| `tanstack-query-best-practices`       | Server state, React Query caching, query keys, mutations, optimistic updates, invalidation, pagination, or SSR    |
| `tanstack-integration-best-practices` | Coordinating TanStack Start, Router, and Query: loader/query flow, SSR dehydration, cache ownership, prefetching  |
| `vercel-react-best-practices`         | React performance, rendering, bundle behavior, async work, Suspense, server/client boundaries, or data fetching   |
| `vercel-composition-patterns`         | Reusable component APIs, compound components, boolean-prop cleanup, provider design, or render/children patterns  |
| `web-design-guidelines`               | UI review, UX review, accessibility review, or checking web interface quality                                     |

### Cloudinary

| Skill                        | Invoke when                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `cloudinary-docs`            | General Cloudinary API, upload, asset management, configuration, or platform behavior                     |
| `cloudinary-react`           | Cloudinary usage in React, responsive media, signed uploads, video players, troubleshooting, or TS usage  |
| `cloudinary-transformations` | Image/video transformations, responsive images, named transformations, AI transforms, costs, or debugging |

For cross-cutting TypeScript, Effect, browser hooks, visual-design, or
architecture work, use the shared root skills in `.agents/skills/` after reading
this file.

## Web MCPs

The repo-local `.codex/config.toml` configures web-facing MCPs:

| MCP                   | Use for                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Vercel                | Inspect projects, deployments, runtime/build logs, preview access, domains, and toolbar comments. |
| Cloudinary asset mgmt | Inspect and manage Cloudinary assets.                                                             |
| Cloudinary env config | Inspect Cloudinary environment and configuration resources.                                       |
| Cloudinary metadata   | Work with Cloudinary structured metadata.                                                         |
| Cloudinary analysis   | Analyze Cloudinary assets and media usage.                                                        |

## Tools

Use backend APIs through `@workspace/backend`; provider setup, Convex functions,
auth, email, billing, and schema changes belong in `packages/backend`.

Run web commands from this workspace unless the task is intentionally
repo-wide. The local typecheck command is `pnpm --filter web typecheck`.
