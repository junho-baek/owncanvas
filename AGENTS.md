# AGENTS

These instructions apply to the OwnCanvas project root.

## Start Gate

- Confirm you are in the OwnCanvas root, not the parent `dndn작업실` directory.
- Run `git status --short --branch` before changing files.
- Read the project context that matches the task:
  - Persistent memory: `wiki/index.md` and `wiki/log.md`
  - DDD/domain: `CONTEXT.md`
  - Product and marketing: `.agents/product-marketing-context.md`
  - UI/design system: `DESIGN.md`
  - Skill availability: `.agents/skills/README.md` and `.agents/skills/registry.json`
- Use `wiki/` as the default work memory. Do not create new `plans/` or `context/` files by default.
- Create `plans/` or `context/` files only when the user explicitly asks, a long/risky task needs a separate execution artifact, or an upstream workflow requires it.

## Wiki Memory

- Use `llm-wiki` before creating, querying, linting, or updating OwnCanvas persistent knowledge.
- Read `wiki/index.md` first, then the smallest relevant wiki pages.
- Append every meaningful task outcome to `wiki/log.md`.
- Put reusable conclusions in `wiki/concepts/`, `wiki/entities/`, or `wiki/analyses/`.
- Write generated wiki pages and durable notes in Korean by default.
- Use stable kebab-case filenames and H1 titles in `한국어 | English` format where practical.
- Keep `raw/` immutable unless the user explicitly asks to reorganize source material.

## Remote Skill Setup

Remote clones may not have the global skills referenced by this project. Check them from the OwnCanvas root:

```bash
npm run skills:check
```

Use strict mode when an automation should fail on missing skills:

```bash
npm run skills:check:strict
```

If skills are missing, restore the relevant group:

```bash
export TRUSTED_SKILLS_DIR=/path/to/trusted/skills
mkdir -p ~/.codex/skills
cp -R "$TRUSTED_SKILLS_DIR"/{DDD-zoom-out,DDD-grill-with-docs,DDD-improve-architecture,DDD-tdd,marketing-ideas,product-marketing-context,community-marketing,marketing-psychology,llm-wiki} ~/.codex/skills/

mkdir -p ~/.gstack/repos
git clone https://github.com/garrytan/gstack.git ~/.gstack/repos/gstack

mkdir -p ~/.codex
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
```

If a destination already exists, update it through that package's normal pull/update flow instead of overwriting local edits.

## Missing Skill Rule

- Do not claim a missing external skill was used.
- If a DDD skill is missing, use `CONTEXT.md` and write the domain assumption in `wiki/log.md` or a relevant `wiki/concepts/` page.
- If a marketing skill is missing, use `.agents/product-marketing-context.md`.
- If `design-review` is missing, use `DESIGN.md` plus local browser/visual verification when UI is involved.
- If `llm-wiki` is missing, update `wiki/index.md`, `wiki/log.md`, and the relevant wiki page directly.
- If a superpowers planning/execution skill is missing, use the project `wiki/` workflow directly.

## Skill Routing

- Use `DDD-zoom-out` before changing domain boundaries, product mental models, or core names.
- Use `DDD-grill-with-docs` when terminology needs pressure-testing against existing docs.
- Use `DDD-improve-architecture` before refactoring model/adapter/component boundaries.
- Use `DDD-tdd` for domain behavior changes that need test-first specification.
- Use `product-marketing-context` before changing positioning, audience, copy, or value proposition.
- Use `marketing-ideas`, `community-marketing`, and `marketing-psychology` for growth, launch, community, objection, or switching-friction work.
- Use `llm-wiki` whenever work should update persistent project memory.
- Use `office-hours` for founder-style product critique.
- Use `plan-ceo-review` before scope or prioritization changes.
- Use `plan-eng-review` before architecture or integration-heavy implementation.
- Use `design-review` after UI work or before finalizing visual direction.
- Use `superpowers:writing-plans` for implementation plans.
- Use `superpowers:executing-plans` to execute written plans through verification.
- Use `superpowers:writing-skills` when creating or changing reusable process/skill documentation.

## Product Defaults

- OwnCanvas is a local-first open creative canvas for operators who already pay for AI tools.
- User-facing language should prefer Creative Canvas, Campaign, Creative Operator, Generation Block, and Creative Output.
- Do not make Workflow the first-screen mental model; workflows emerge later from repeated generation blocks.
- UI work should follow the Airtable-inspired `DESIGN.md` tokens and avoid introducing an unrelated visual language.
