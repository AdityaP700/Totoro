"""Audit the synthetic 170-case Cheerio Resolve dataset.

Reads docs/source/cheerio_resolve_synthetic_eval_170.jsonl, validates schema,
computes class balance, duplicates, label conflicts, and writes:
  - docs/audits/DATASET_AUDIT.md
  - docs/audits/dataset_audit.json

Exit code 1 if schema-invalid rows or duplicate case IDs are found.
"""
import json
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "docs" / "source" / "cheerio_resolve_synthetic_eval_170.jsonl"
OUT_MD = REPO / "docs" / "audits" / "DATASET_AUDIT.md"
OUT_JSON = REPO / "docs" / "audits" / "dataset_audit.json"

REQUIRED_FIELDS = [
    "case_id", "split", "synthetic", "source_provenance", "user_message",
    "language", "issue_type", "urgency", "needs_human", "expected_route",
    "confidence_band", "state_available", "expected_reasoning",
    "expected_action", "safety_constraint", "reason_code",
    "reason_code_provenance", "expected_outcome", "notes",
]

VALID = {
    "split": {"evaluation", "adversarial"},
    "language": {"en", "hinglish"},
    "urgency": {"low", "medium", "high", "critical"},
    "expected_route": {"human_handoff", "clarify_once", "rules_playbook"},
    "state_available": {"yes", "partial_or_missing", "conflicting_or_context_dependent"},
}


def main() -> int:
    rows = []
    errors = []
    for i, line in enumerate(SRC.read_text(encoding="utf-8-sig").splitlines(), 1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as e:
            errors.append(f"line {i}: invalid JSON: {e}")

    ids = [r.get("case_id") for r in rows]
    dup_ids = [k for k, v in Counter(ids).items() if v > 1]

    for r in rows:
        cid = r.get("case_id", "?")
        for f in REQUIRED_FIELDS:
            if f not in r or r[f] in (None, ""):
                errors.append(f"{cid}: missing field {f}")
        for f, allowed in VALID.items():
            if f in r and r[f] not in allowed:
                errors.append(f"{cid}: invalid {f}={r[f]!r}")
        if r.get("synthetic") is not True:
            errors.append(f"{cid}: synthetic is not true")
        if r.get("source_provenance") != "SYNTHETIC_AUTHORED_NOT_REAL_TICKETS":
            errors.append(f"{cid}: unexpected source_provenance {r.get('source_provenance')!r}")
        if r.get("reason_code") != "UNKNOWN_OR_NOT_PROVIDED":
            errors.append(f"{cid}: reason_code unexpectedly {r.get('reason_code')!r}")

    # Duplicated utterances and label conflicts across identical utterances
    by_msg = {}
    for r in rows:
        by_msg.setdefault(r["user_message"].strip().lower(), []).append(r)
    dup_msgs = {m: rs for m, rs in by_msg.items() if len(rs) > 1}
    conflicts = []
    for m, rs in dup_msgs.items():
        for field in ("issue_type", "urgency", "needs_human", "expected_route"):
            labels = {r[field] for r in rs}
            if len(labels) > 1:
                conflicts.append({
                    "message": m[:80],
                    "field": field,
                    "labels": sorted(str(x) for x in labels),
                    "cases": [r["case_id"] for r in rs],
                })

    def dist(field):
        return dict(Counter(str(r.get(field)) for r in rows).most_common())

    needs_human_by_issue = {}
    for r in rows:
        needs_human_by_issue.setdefault(r["issue_type"], Counter())[str(r["needs_human"])] += 1

    # Cross-label consistency check: route vs needs_human
    # human_handoff should imply needs_human True; flag violations as data-quality notes
    route_hr = Counter((r["expected_route"], str(r["needs_human"])) for r in rows)
    odd_pairs = [
        {"route": k[0], "needs_human": k[1], "count": v}
        for k, v in route_hr.items()
        if (k[0] == "human_handoff") != (k[1] == "True")
    ]

    audit = {
        "row_count": len(rows),
        "unique_case_ids": len(set(ids)),
        "duplicate_case_ids": dup_ids,
        "schema_errors": errors,
        "duplicated_utterances": {m[:80]: [r["case_id"] for r in rs] for m, rs in dup_msgs.items()},
        "duplicated_utterance_count": len(dup_msgs),
        "label_conflicts": conflicts,
        "distributions": {
            "split": dist("split"),
            "language": dist("language"),
            "issue_type": dist("issue_type"),
            "urgency": dist("urgency"),
            "expected_route": dist("expected_route"),
            "needs_human": dist("needs_human"),
            "state_available": dist("state_available"),
            "confidence_band": dist("confidence_band"),
            "expected_action": dist("expected_action"),
            "expected_outcome": dist("expected_outcome"),
        },
        "needs_human_by_issue": {k: dict(v) for k, v in needs_human_by_issue.items()},
        "route_vs_needs_human": {f"{k[0]}|{k[1]}": v for k, v in route_hr.items()},
        "route_needs_human_mismatches": odd_pairs,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")

    md = [
        "# Dataset audit — cheerio_resolve_synthetic_eval_170",
        "",
        f"Generated by `tools/audit_dataset.py` on 2026-10-13. Source: `docs/source/cheerio_resolve_synthetic_eval_170.jsonl` (170 rows expected).",
        "",
        "## Headline numbers",
        "",
        f"- Rows: **{len(rows)}**, unique case IDs: **{len(set(ids))}**, duplicate IDs: **{len(dup_ids)}**",
        f"- Schema errors: **{len(errors)}**",
        f"- Duplicated utterances: **{len(dup_msgs)}** distinct messages appear more than once",
        f"- Label conflicts across identical utterances: **{len(conflicts)}**",
        f"- Route/needs-human mismatch pairs (human_handoff without needs_human or vice versa): **{len(odd_pairs)}**",
        "",
        "## Class balance",
        "",
    ]
    for field in ("split", "language", "issue_type", "urgency", "expected_route", "needs_human", "state_available"):
        md.append(f"### {field}")
        md.append("")
        md.append("| Value | Count |")
        md.append("|---|---|")
        for k, v in audit["distributions"][field].items():
            md.append(f"| {k} | {v} |")
        md.append("")
    if conflicts:
        md.append("## Label conflicts (same utterance, different labels)")
        md.append("")
        for c in conflicts:
            md.append(f"- `{c['message']}` field=`{c['field']}` labels={c['labels']} cases={c['cases']}")
        md.append("")
    if odd_pairs:
        md.append("## Route vs needs-human cross-label pairs")
        md.append("")
        for p in odd_pairs:
            md.append(f"- route=`{p['route']}` needs_human=`{p['needs_human']}` count={p['count']}")
        md.append("")
    if errors:
        md.append("## Schema errors")
        md.append("")
        for e in errors:
            md.append(f"- {e}")
        md.append("")
    md.append("## Interpretation limits")
    md.append("")
    md.append("- This is a synthetic, hand-authored evaluation set (SYNTHETIC_AUTHORED_NOT_REAL_TICKETS);")
    md.append("  labels are evaluation targets, not provider truth and not real Cheerio ticket data.")
    md.append("- `reason_code` is deliberately UNKNOWN_OR_NOT_PROVIDED in every row; no official provider")
    md.append("  code may be inferred from this dataset.")
    md.append("- Duplicated utterances with consistent labels are intentional template variations")
    md.append("  (prefix patterns like \"Quick question:\", \"This is blocking my team.\"); they must not be")
    md.append("  counted as independent evidence of label reliability.")
    OUT_MD.write_text("\n".join(md), encoding="utf-8")

    print(f"rows={len(rows)} errors={len(errors)} dup_msgs={len(dup_msgs)} conflicts={len(conflicts)} odd_pairs={len(odd_pairs)}")
    print(f"wrote {OUT_MD.name}, {OUT_JSON.name}")
    return 1 if errors or dup_ids else 0


if __name__ == "__main__":
    sys.exit(main())
