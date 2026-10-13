# Cheerio Resolve — Laya challenge evaluation pack

This pack adds a **separate 80-case synthetic challenge set** for Cheerio Resolve. It does not modify or replace the existing 170-case dataset or its iteration/held-out split.

- `cheerio_resolve_challenge_80.jsonl`: one JSON object per line.
- `cheerio_resolve_challenge_80.csv`: spreadsheet-friendly equivalent.
- `LOCAL_LAYA_EVALUATION_PLAN.md`: Windows preflight, isolated Python environment, Laya setup, safety constraints, and evaluation protocol.

All 80 cases are authored synthetic scenarios, not private tickets and not provider ground truth. The labels are proposed evaluation targets and should be reviewed before treating them as authoritative. Unknown provider reason codes remain explicitly unknown.

The set spans 10 issue types, English and some Hinglish, missing/conflicting state, explicit human requests, billing/security guardrails, and false-verification risks.

**Important:** the dataset is ready; actual Laya inference has not been run by generating this pack. Run the preflight checks on the target machine before downloading weights.
