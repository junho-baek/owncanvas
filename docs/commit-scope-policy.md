# 커밋 범위 정책 | Commit Scope Policy

OwnCanvas Campaign work must be split so the commit title shows the review boundary before a reviewer opens the diff.

## Title Format

Use one scope token:

```txt
<scope>: <summary>
```

Valid scopes:

- `campaign-core`: Campaign rules, state transitions, validation, and derived read models.
- `ui`: React components and page layout that consume Campaign contracts.
- `storage`: localStorage, persistence mapping, and compatibility.
- `plugin`: External providers, automation, and extension glue.
- `api`: HTTP route contracts that consume Campaign core.
- `tests`: Focused regression or contract tests.
- `docs`: Documentation and project memory.
- `tooling`: Scripts, checks, and build/development tooling.

## Campaign Boundary Rule

Campaign core comes first. Put Campaign rules, state transitions, validation, and derived read models behind a focused `campaign-core:` commit before UI, storage, plugin, or API consumers depend on it.

The first Campaign contract commit must be independent: only Campaign model contract files and focused model tests under `app/features/creative-canvas/model/` belong there. Downstream `api:`, `ui:`, `storage:`, and `plugin:` commits must appear after that contract commit and consume the exported core contract instead of redefining rules locally. Core contract commits must not include API routes, React surfaces, page layout routes, persistence/client files, plugin adapter files, stylesheet files, or docs/tooling updates.

UI work that consumes a new Campaign contract must be a separate later `ui:` commit. Keep React components, Campaign page route rendering surfaces, and stylesheet updates out of the `campaign-core:` commit that defines the rule, state transition, validation, or derived read model.

Storage work that consumes a new Campaign contract must be a separate later `storage:` commit. Keep localStorage access, persistence mapping, and compatibility updates out of plugin adapter commits, and keep provider, automation, extension, or agent/plugin route adapter changes out of `storage:` commits.

Plugin work that consumes a new Campaign contract must be a separate later `plugin:` commit. Keep external provider adapters, automation glue, extension glue, and agent/plugin route adapters out of `campaign-core:` commits, and do not land them before the core contract commit they consume.

Commit history must show this boundary directly: a reviewer should be able to scan the ordered commits and see one or more `campaign-core:` contract commits before separate `plugin:` commits. Any commit that contains both Campaign model contract files and plugin adapter files must be split before review.

Do not use a title that joins scopes, such as `campaign-core/ui:` or `campaign-core: add ui and storage state`. Do not put another scope in the summary, such as `campaign-core: add ui completion state`. If one title needs multiple scopes, split the work.

## Campaign Scope Separation

Keep each Campaign commit inside one review boundary:

- `campaign-core`: `app/features/creative-canvas/model/` Campaign rules, state transitions, validation, and derived read models.
- `api`: `app/routes/api.campaign*.ts` and focused Campaign route contract tests.
- `ui`: `app/features/creative-canvas/components/`, Campaign page route rendering surfaces, and stylesheet files.
- `storage`: Campaign local storage, persistence mapping, and compatibility paths.
- `plugin`: `app/features/plugins/`, creative-canvas plugin adapter glue, and agent/plugin route adapters.

Do not combine model, route, component, persistence, and plugin adapter changes in one commit. If a feature touches more than one boundary, land the smallest focused commit first and make each downstream consumer follow in its own scoped commit.

## Revert Rule

Every Campaign-related commit in a PR must be revertible as one scoped unit. A `git revert <commit>` should remove only one Campaign boundary: `campaign-core`, `api`, `ui`, `storage`, or `plugin`.

The commit title scope must match the files it changes. For example, an API route contract commit must use `api:`, not `ui:`, and a commit that touches both a React component and persistence mapping must be split before review. Non-Campaign docs or tooling commits may sit beside the Campaign sequence, but they do not count as Campaign revert units.

## Explainable Intermediate States

Avoid giant one-shot Campaign diffs. Every intermediate Campaign commit must be explainable without opening the full diff:

- what single boundary changed (`campaign-core`, `api`, `ui`, `storage`, or `plugin`);
- why that state is reviewable on its own;
- which focused verification command proves that state;
- which boundary, if any, comes next.

If a commit needs multiple Campaign boundaries to explain the current state, split it before review.

## Check

Validate a proposed title with:

```bash
npm run commit:title -- "campaign-core: add completion transition guard"
```

Validate a commit message file with:

```bash
npm run commit:title -- .git/COMMIT_EDITMSG
```
