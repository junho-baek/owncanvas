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

The Go-backed Image Block generation service runs separately:

```bash
cd generation
OWNCANVAS_REPLICATE_API_TOKEN="$REPLICATE_API_TOKEN" go run ./cmd/owncanvas-generation
```

Go service environment:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OWNCANVAS_REPLICATE_API_TOKEN` | Required when the internal generation service route is `provider: "replicate"` | Replicate API token read only by the Go service process. The user-facing Image Block choice is the selected image model, for example `google/nano-banana`; Replicate is the model-serving service. Use your existing `REPLICATE_API_TOKEN` value by exporting or prefixing it as `OWNCANVAS_REPLICATE_API_TOKEN`. |
| `OWNCANVAS_GENERATION_ADDR` | Optional | Go service listen address. Defaults to `127.0.0.1:8787`. |
| `OWNCANVAS_REPLICATE_BASE_URL` | Optional | Replicate-compatible API base URL for tests or compatible providers. Defaults to `https://api.replicate.com`. |
| `OWNCANVAS_REPLICATE_WAIT_SECONDS` | Optional | Replicate `Prefer: wait=N` seconds. Defaults to `60`. |
| `OWNCANVAS_GENERATION_SERVICE_URL` | Optional for React Router | React Router bridge target when the Go service is not running on the default local URL. |

Without `OWNCANVAS_REPLICATE_API_TOKEN`, jobs routed through the Replicate model service fail per node with a missing-credential error while the built-in `mock` route remains available for local contract tests. Do not put the token in Campaign JSON, browser state, or committed files.

Smoke a real Replicate-compatible image request with:

```bash
curl -sS http://127.0.0.1:8787/v1/generation/batches \
  -H 'content-type: application/json' \
  -d '{"batchId":"smoke_replicate","campaignId":"campaign_smoke","sourceNodeId":"image_source","fanOutCount":1,"jobs":[{"jobId":"job_1","nodeId":"image_node_1","prompt":"A coral product photo on a white studio sweep","provider":"replicate","model":"google/nano-banana","aspectRatio":"1:1","parameters":{"output_format":"png"}}]}'
```

To preview on your phone, run the dev server on your LAN interface:

```bash
npm run dev -- --host 0.0.0.0
```

Then open the machine's LAN IP from your phone browser.

## Agent Skill Setup

OwnCanvas keeps project-specific agent instructions in `AGENTS.md`, persistent project memory in `wiki/`, and the external skill registry in `.agents/skills/`. Remote clones can check whether the expected DDD, marketing, llm-wiki, gstack, and superpowers skills are installed:

```bash
npm run skills:check
```

Missing skills should be restored with the commands printed by the checker, or handled through the fallback docs listed in `.agents/skills/README.md`.

## Plugin Workflow Example

The plugin-system example workflow is documented in `app/features/plugins/model/README.md`. It covers the comment-to-DM-to-landing commerce flow, including plugin registration, DM routing, landing referral parsing, conversion tracking, and synchronized Campaign JSON/canvas state.

Run the focused regression with:

```bash
node --experimental-strip-types --test app/features/plugins/model/plugin-registration-template-routing.test.ts
```

Start the app with `npm run dev`, then inspect plugin discovery through `/api/plugin-kinds`, `/api/plugin-kinds/direct-message`, `/api/agent/plugins`, and `/api/agent/plugins?view=installed`.

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

Local project files, caching, and broader generation adapters come next.

## Design System

UI work should use `DESIGN.md` as the product design reference. It was installed with:

```bash
npx getdesign@latest add airtable
```
