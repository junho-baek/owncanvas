# OwnCanvas

Use the AI you already pay for.

OwnCanvas is a local-first creative AI canvas for your own keys, subscriptions, and models. It starts as a lightweight React Router workspace for building campaign creative with text, image, video, and voice generation blocks without another canvas subscription.

## Local Preview

```bash
npm install
npm run skills:check
npm run dev
```

Open the local URL printed by React Router.

## Agent Skill Setup

OwnCanvas keeps project-specific agent instructions in `AGENTS.md`, persistent project memory in `wiki/`, and the external skill registry in `.agents/skills/`. Remote clones can check whether the expected DDD, marketing, llm-wiki, gstack, and superpowers skills are installed:

```bash
npm run skills:check
```

Missing skills should be restored with the commands printed by the checker, or handled through the fallback docs listed in `.agents/skills/README.md`.

## Current Scope

- React Router v7 app scaffold
- Tailwind v4 styling
- Airtable-inspired `DESIGN.md` from `getdesign`
- React Flow creative canvas
- DNDN-inspired campaign canvas surface
- Generation Palette with text, image, video, and voice blocks
- Mock campaign creative data

## App Structure

```txt
app/
  core/
    lib/
  features/
    creative-canvas/
      adapters/
      components/
      model/
  routes/
```

Provider execution, local project files, caching, and real generation adapters come next.

## Design System

UI work should use `DESIGN.md` as the product design reference. It was installed with:

```bash
npx getdesign@latest add airtable
```
