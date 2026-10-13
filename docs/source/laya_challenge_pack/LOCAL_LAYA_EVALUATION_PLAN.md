# Local Laya evaluation plan — Cheerio Resolve

## Guardrails
- Preserve the original `cheerio_resolve_synthetic_eval_170.jsonl` and its iteration/held-out split unchanged.
- Run the current rules baseline and Laya on identical case IDs. Report them separately.
- The `CRX-001`–`CRX-080` challenge set is synthetic, authored for evaluation, and must remain a separate dataset.
- Never use real private customer tickets, credentials, phone numbers, or account identifiers.
- Never let Laya directly execute an action. Laya proposes typed decisions; deterministic policy code owns safety, consent, allowlists, action execution, and verification.
- Do not claim a score before the actual model has run. Record failures and unknown labels.

## Local prerequisites (Windows PowerShell)
Run from `D:\Development\Projects\core\Totoro`. These commands inspect first; they do not download model weights.

```powershell
python --version
py -0p
Get-CimInstance Win32_ComputerSystem | Select-Object @{N='RAM_GB';E={[math]::Round($_.TotalPhysicalMemory/1GB,1)}}
Get-PSDrive -Name C,D | Select-Object Name,@{N='Free_GB';E={[math]::Round($_.Free/1GB,1)}}
nvidia-smi
```

If `nvidia-smi` is unavailable, record that fact; do not assume CUDA is configured. Laya can run on CPU. Check that Python is 3.10+ and that there is roughly 2 GB free disk for one checkpoint plus dependencies, and at least ~3 GB free RAM for a single checkpoint (4 GB free RAM is a practical starting point). If any check fails, stop before installing or downloading weights.

## Create an isolated environment only after preflight passes

Use a project-local `.venv-laya` so existing Node/TypeScript dependencies remain untouched:

```powershell
py -3.11 -m venv .venv-laya
.\.venv-laya\Scripts\python.exe -m pip install --upgrade pip
```

Then install Laya in that environment only:

```powershell
.\.venv-laya\Scripts\python.exe -m pip install laya
.\.venv-laya\Scripts\python.exe -I -c "import laya; print(getattr(laya, '__version__', 'version-unavailable'))"
```

The package install itself does not necessarily download checkpoint weights; the first real `Router.predict` / `laya.load` does. Before the first inference, check available disk and RAM again. Prefer loading only the checkpoint required for the test rather than preloading every checkpoint. Start with the English checkpoint for English cases and separately evaluate multilingual support cases if resources permit. The `laya` Router can also select a checkpoint, but may keep multiple checkpoints in memory.

Official references:
- Quickstart: https://laya-ai.com/guides/install-laya
- Requirements: https://laya-ai.com/guides/laya-requirements
- Upstream repo: https://github.com/NandhaKishorM/laya

## Inference protocol
Laya accepts typed `choice`, `score`, and `noul` questions over a state. Map the product's output schema explicitly:
- issue type: `choice` among the repository's exact allowed issue labels
- urgency: `score` with fixed ordered labels
- needs-human: `noul` question asking whether policy/evidence requires human handling
- route: either a separate `choice` or deterministic mapping from approved policy output

Do not treat Laya confidence as a guarantee. Keep existing `validateModelOutput()` and safety interceptor in front of all application decisions. For security, identity/ownership, billing/refunds, explicit human requests, conflicting state, missing critical evidence, two failed attempts, and failed verification, the deterministic guardrail must override model output.

## Evaluation protocol
1. Run existing tests and save a baseline result before changes.
2. Freeze the original 170-case data and current held-out membership. Do not add CRX cases to the original held-out split.
3. Run rules and Laya on the same original 170 cases, then separately on CRX challenge cases. Do not tune on held-out or challenge cases and then report them as untouched evaluation.
4. Score per-class precision/recall/F1 for issue type, urgency accuracy, route accuracy, needs-human recall, critical safety violations, invalid output rate, fallback rate, latency p50/p95, and model/runtime version.
5. Report the actual number of completed cases. Failed inference must be reported, not silently excluded. Include a paired error table: case ID, rules output, Laya output, guarded final output, expected label, error category.
6. Verify deterministic fallback when model load fails, inference throws, output is invalid, or confidence is below the chosen threshold.
7. Run `npm test` and `npm run build`. Review `git diff` and `git status`; stage explicit files only. Never commit model weights, caches, `.venv-laya`, secrets, or generated `dist/` unless the repo already explicitly tracks them.

## Completion report
- Environment preflight: pass/fail with outputs
- Laya package/version and checkpoint used
- Device actually used (CPU/CUDA); do not infer CUDA from GPU presence
- Whether weights were downloaded, and approximate disk footprint
- Original 170-case baseline vs actual Laya vs guarded hybrid metrics
- Separate CRX-080 results
- Latency, failures, fallbacks, safety violations
- Tests/build results
- Files changed and commit hash, if committed
