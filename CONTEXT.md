# Creative Canvas

Creative Canvas is the OwnCanvas context for local-first creative production, where operators combine prompts, references, models, and provider accounts to make creative outputs without buying another closed canvas subscription.

## Language

**Creative Canvas**:
The context where creative operators create and organize AI-assisted outputs across multiple providers.
_Avoid_: Workflow Canvas as the primary product frame

**Canvas**:
The editing surface where prompts, references, generation blocks, and outputs are arranged visually.
_Avoid_: Treating Canvas as the core domain object

**Creative Operator**:
A marketer, founder, agency operator, content lead, or designer-marketer who coordinates multiple AI tools to produce creative work.
_Avoid_: Result Maker, Workflow Maker

**Campaign**:
A focused creative work unit that contains the canvas, inputs, generation blocks, and outputs for one marketing or content goal.
_Avoid_: Workflow Draft, board

**Creative Project**:
A broader internal concept for creative work units that may not be campaign-shaped.
_Avoid_: Using Creative Project in first-screen UI

**Creative Output**:
An image, video, or composed asset produced from the user's prompt, inputs, and provider accounts.
_Avoid_: Job result, artifact

**Generation Block**:
A user-facing canvas item that creates, transforms, or organizes creative output.
_Avoid_: Workflow Node as the primary user-facing term

**Text Block**:
A generation block that turns campaign briefs into copy, concepts, and prompts through an LLM.
_Avoid_: LLM Node in user-facing copy

**Image Block**:
A generation block that creates, edits, or varies still images.
_Avoid_: Image job

**Video Block**:
A generation block that creates or extends moving creative assets.
_Avoid_: Video job

**Voice Block**:
A generation block that creates voice, narration, or spoken variants for a campaign.
_Avoid_: TTS node in user-facing copy

**Generation Palette**:
The set of generation blocks and creative tools that can be added to the canvas.
_Avoid_: Node Catalog in user-facing copy, toolbar, menu

**Workflow**:
A repeatable structure extracted from canvas activity after the user has found a useful creative process.
_Avoid_: Making Workflow the first-screen mental model

## Relationships

- A **Creative Operator** creates one or more **Campaigns**.
- A **Campaign** owns one **Canvas**.
- A **Campaign** produces one or more **Creative Outputs**.
- A **Canvas** displays and edits **Generation Blocks** and **Creative Outputs** for a **Campaign**.
- A **Generation Palette** defines which **Generation Blocks** can be added to a **Canvas**.
- The MVP **Generation Palette** includes **Text Blocks**, **Image Blocks**, **Video Blocks**, and **Voice Blocks**.
- A **Workflow** may be extracted from repeated **Generation Blocks** after a useful creative process emerges.

## Example dialogue

> **Dev:** "Should the first screen ask the user to build a workflow?"
> **Domain expert:** "No. A Creative Operator starts a Campaign, makes outputs on the Canvas, and only turns repeated patterns into Workflows later."

## Flagged ambiguities

- "Canvas" can mean the product surface or the work itself. Resolved: **Canvas** is the visual editing surface; **Creative Output** is what the user produces.
- "Workflow" was initially treated as the primary user-facing object. Revised: the primary user goal is creating **Creative Outputs**; workflow structure may emerge later from canvas activity.
- "Campaign" can sound marketing-only. Resolved: **Campaign** is the first-screen work unit for marketing and content goals; **Creative Project** remains the broader internal concept.
- "LLM Node" was used to describe text generation. Resolved: user-facing language is **Text Block**; implementation may still bind to LLM providers.
