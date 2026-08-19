---
title: Decision — Khmer scan accuracy via swappable model + self-consistency
type: decision
status: accepted
source: agent memory (khmer-scan-accuracy branch)
tags: [decision, ai, ocr, scan, accuracy]
added: 2026-07-15
---

## Decision
To improve document-scan accuracy for Khmer text:
1. Make the scan model **swappable** via `SCAN_MODEL` (e.g. `gpt-5.6-terra`).
2. Run **N = 3 self-consistency** — scan three times and reconcile the results
   rather than trusting a single pass.
3. Show a **confidence UI** at Step 2 so the user can see/verify low-confidence fields.

## Why
- Khmer OCR is error-prone; a single model pass is unreliable.
- Self-consistency (majority across N runs) catches one-off misreads cheaply.
- Surfacing confidence lets the human correct before the data is trusted, which
  fits the Verified trust model.

## Consequence
- `SCAN_MODEL` must be a valid slug (there is no plain `gpt-5.6` slug — use the
  `-terra` variant).
- Cost/latency rises ~3× per scan; acceptable for accuracy on legal documents.
- Branch: `khmer-scan-accuracy` (uncommitted as of writing — confirm before relying).

## Links
- [[user-journeys]] (add-property scan) · [[open-questions]]
