# CHANGELOG

User-visible changes. (Internal engineering notes live in the other continuity files.)

## 2026-10-13 — Phase 0 (inspection & decisions)

- Added the full source pack to `docs/source/` (design brief, implementation handoff,
  research dossier, master prompt pack, dataset schema, 170-case synthetic dataset,
  original workbook) as read-only provenance.
- Added dataset audit tooling (`tools/audit_dataset.py`) and the first audit report
  (`docs/audits/DATASET_AUDIT.md`): 170/170 rows valid, no duplicates, no label conflicts.
- Added architecture decision record (`docs/adr/ADR-0001…`) selecting the TypeScript +
  Vite + React + Vitest stack and the pure-domain-core architecture.
- Added risk register, decision log and all continuity files; added `.gitignore` and
  pinned Python sidecar requirements (openpyxl only).
- No product behaviour exists yet — implementation starts in Phase 1.
