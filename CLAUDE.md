# Valgate — Claude Instructions

## Project

Valgate is a Cambodia-focused property portfolio management web app. Currently a UI mockup being converted into a fully functioning application.

- Stack: React 18, TypeScript, Vite, Tailwind CSS v4, React Router v7, Radix UI / shadcn-ui, Recharts
- See `docs/specs/architecture.md` for folder structure and routing
- See `docs/specs/domain.md` for domain model, terminology, and feature areas
- See `docs/specs/conventions.md` for coding conventions

## Important Rules

- Do not edit anything in `src/imports/` — these are auto-generated Figma exports, treat as read-only reference
- Use named exports for all components
- Use Tailwind utility classes for styling; prefer design token classes over hardcoded hex values
- Use `lucide-react` for icons (not MUI icons)
- Data is currently hardcoded in page files — when adding real data, use React Query

## Design System

Do NOT consult the design system unless the user explicitly asks you to (e.g. "follow the design system", "use the design system", "apply the design system"). The spec is at `docs/specs/valgate-design-system-v1.1.md` — only read it on demand.

## Docs Structure

```
docs/
  notes/    # Human-facing: assessments, roadmap, decisions
  specs/    # AI reference: architecture, domain model, conventions
CLAUDE.md   # This file — always loaded by Claude Code
```
