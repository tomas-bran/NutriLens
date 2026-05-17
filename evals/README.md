# NutriLens — Evaluations

> Quality assurance harness for the AI pipeline. Measures how well the model
> extracts product data from labels, detects whether an image is a food label,
> generates explanations and answers chat questions. See
> [`docs/specs/E07-evaluation-strategy.md`](../docs/specs/E07-evaluation-strategy.md)
> for the full strategy.

## Folder layout

```
evals/
├── README.md               ← this file
├── dataset/                ← labeled inputs with expected outputs
│   ├── manifest.json       ← index of all cases (id, file, expected, tags)
│   ├── images/             ← own photos + Open Food Facts images
│   ├── pdfs/               ← product spec sheets, factsheets
│   └── non-food/           ← negative cases for detect_label_kind
├── chat/
│   └── intents.json        ← labeled questions with expected intent JSON
├── runner/
│   ├── run-eval.ts         ← main entry point
│   ├── metrics.ts          ← precision / recall / F1 / fuzzy match
│   └── reporter.ts         ← markdown report generator
├── results/                ← committed reports (audit trail)
│   └── .gitkeep
└── .cache/                 ← cached model responses (gitignored)
```

## Quick start

```bash
# 1. Ensure you have a real provider configured (mock is useless here).
export IA_PROVIDER=foundry
export AZURE_AI_FOUNDRY_ENDPOINT=...
export AZURE_AI_FOUNDRY_KEY=...

# 2. Run a full eval for the extraction prompt.
npm run eval -- --prompt extract_product-v1

# 3. Filter while iterating.
npm run eval -- --prompt extract_product-v1 --filter category=galletitas
npm run eval -- --prompt extract_product-v1 --id 001

# 4. Re-run without hitting the model (uses .cache/).
npm run eval -- --prompt extract_product-v1 --cache-only

# 5. Compare two prompt versions side by side.
npm run eval -- --compare extract_product-v1 extract_product-v2
```

Every run drops a markdown report under `results/`. Commit the report along
with the prompt change so the team can audit how each version performed.

## What you'll need

- A real provider configured (`mock` provider is intentionally unhelpful here —
  it always returns the same fixed answer).
- ~$0.08 USD in tokens for a full run (see spec §8 for breakdown).
- A populated `dataset/manifest.json` (we ship with 0 cases — see below).

## Building the dataset

We ship the harness with **no cases** to keep the repo lean. To populate:

1. Read the spec §2 to understand the coverage matrix we are aiming for.
2. Use the helper `npm run eval:scaffold-case -- --id 001 --file foo.jpg`
   to append an empty entry to `manifest.json` (TODO: implement in US-40).
3. Fill in `expected` by hand looking at the actual label.
4. Commit images alongside `manifest.json`.

Plan: ~15 own photos + ~10 from Open Food Facts. See US-40 in
`docs/backlog/stories/E07-quality-evaluation.md`.

## What goes into `.cache/`

Each call to the model is hashed by:

- The prompt version (sha256 of the prompt file).
- The input file (sha256 of the image/PDF bytes).
- The model identifier.

If a hash hit is found, no model call is made. Useful when iterating on the
**metrics** (parsing/scoring code) without re-running the LLM.

## Thresholds

The runner exits with non-zero status if any metric falls below its
**MVP threshold** as defined in the spec §5. Safety-critical metrics
(`alergenos`, `sellos`, `riesgo`, `chat_answer.faithfulness`) must clear
the **demo threshold**, not just MVP — see spec §5 note.
