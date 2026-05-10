# OwnCanvas

Use the AI you already pay for.

OwnCanvas is a local-first creative AI canvas for your own keys, subscriptions, and models. It starts as a lightweight React Router workspace for building campaign creative with text, image, video, and voice generation blocks without another canvas subscription.

## Local Preview

```bash
npm install
npm run dev
```

Open the local URL printed by React Router.

## Current Scope

- React Router v7 app scaffold
- Tailwind v4 styling
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
