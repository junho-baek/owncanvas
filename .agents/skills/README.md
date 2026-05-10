# OwnCanvas Skill Registry

This directory does not vendor full external skill bodies. It records which skills OwnCanvas agents should try to use, where those skills are normally installed, and what to do when a remote clone does not have them.

## Check Availability

From the OwnCanvas project root:

```bash
npm run skills:check
```

Use strict mode when an automation should fail on missing skills:

```bash
npm run skills:check:strict
```

## Expected Roots

| Group | Expected location | Restore command |
| --- | --- | --- |
| Codex personal/team skills | `~/.codex/skills/<skill>/SKILL.md` | `export TRUSTED_SKILLS_DIR=/path/to/trusted/skills && mkdir -p ~/.codex/skills && cp -R "$TRUSTED_SKILLS_DIR"/{DDD-zoom-out,DDD-grill-with-docs,DDD-improve-architecture,DDD-tdd,marketing-ideas,product-marketing-context,community-marketing,marketing-psychology} ~/.codex/skills/` |
| gstack skills | `~/.gstack/repos/gstack/.agents/skills/gstack-*/SKILL.md` | `mkdir -p ~/.gstack/repos && git clone https://github.com/garrytan/gstack.git ~/.gstack/repos/gstack` |
| superpowers skills | `~/.codex/superpowers/skills/<skill>/SKILL.md` | `mkdir -p ~/.codex && git clone https://github.com/obra/superpowers.git ~/.codex/superpowers` |

If a destination already exists, update it using the package owner's normal pull/update flow instead of overwriting local changes.

## Fallback Rule

If a listed skill is missing, do not pretend it ran. Use the project-local fallback:

- DDD/domain decisions: `CONTEXT.md`
- Product/marketing decisions: `.agents/product-marketing-context.md`
- UI/design decisions: `DESIGN.md`
- Execution record: `plans/` before work and `context/` after verification

The machine-readable source of truth is `registry.json`.
