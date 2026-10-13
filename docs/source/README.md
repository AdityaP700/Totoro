# Cheerio Resolve synthetic evaluation dataset pack

## Contents
- `cheerio_resolve_synthetic_eval_170.jsonl`: 170 synthetic cases, one JSON object per line.
- `cheerio_resolve_synthetic_eval_170.csv`: spreadsheet-friendly case table.
- `cheerio_resolve_eval_and_cost_workbook.xlsx`: scenarios, label guide, evaluation scorecard, editable cost assumptions.
- `DATASET_SCHEMA.md`: field definitions, use, and limitations.
- `AGENT_EXECUTION_PROMPT.md`: prompt for the coding agent to inspect the provided project ZIP, integrate the dataset, use browser/spreadsheet tools where available, set up an isolated environment, maintain Git history and `.gitignore`, and execute phase gates.

## Important limits
This is a synthetic, hand-authored evaluation set. It contains no real customer data. It is not a source of official Meta/Cheeri(o) reason codes, not a representative sample of real support traffic, and not evidence that an AI model performs well in production. The `reason_code` field is deliberately `UNKNOWN_OR_NOT_PROVIDED` unless the implementation separately loads a verified, cited reason from an authoritative source.

Do not train a model on this dataset as the default path. Use it first for rules tests, triage evaluation, safety regression tests, and a transparent comparison of rules vs an optional model adapter. Any model comparison must use the same held-out cases and record model/version, prompt, date, latency, cost, failures and results.

## Integration guidance
The agent should inspect the project before choosing a stack or installing packages. Create/activate a virtual environment only for a required Python sidecar or evaluation script. Do not install CUDA/TensorFlow/PyTorch merely because a GPU exists. First inspect GPU/driver, Python version, project dependencies and whether GPU compute is actually needed. The core prototype should remain usable in rules-only mode without external APIs or GPU dependencies.

Use the existing `.gitignore` as the source of truth. Merge only missing patterns; never overwrite it blindly. Never track `.env*`, API keys, tokens, model weights, caches, venvs, build output, or generated private data. Do not inspect or print secret values.


## Design workflow clarification
Z Code / Antigravity owns implementation first. Codex will handle the visual design pass later. The execution prompt therefore asks the implementation agent to create a simple functional, accessible UI and a `DESIGN_HANDOFF.md`, while keeping components and domain logic separated. It explicitly avoids spending time on final visual polish or Dribbble research now.
