# ModelArena

A browser-local human evaluation workspace for paired model responses. Compare two supplied responses per prompt, assign scores using a shared rubric, then reveal model names and export the review. This tool does not run models, call APIs, or automatically judge quality.

## Use

Open the GitHub Pages project or run `node modelarena/server.mjs` from the repository root, then open http://127.0.0.1:4174. Node 20+ is needed only for the server and tests. Run `node --test modelarena/tests/*.test.mjs`.

1. Try the fictional three-case demo, create a comparison with pasted responses, or import a JSON suite.
2. Score both anonymous answers on correctness, relevance, and clarity, each from 1 (poor) to 5 (excellent). Optionally record evidence in reviewer notes.
3. Save each case. The same case can be revisited and updated before revealing. Unsaved edits prompt before navigation. Add cases before revealing if needed.
4. Reveal after every case is scored. Scores are locked after reveal. Review mapped identities, rubric means, case wins and ties, and the full review trail.
5. Export score CSV or a complete session JSON backup. Session JSON can be imported to resume, preserving order, saved ratings, and reveal status.

## Input format

Download the example suite in the interface. JSON schema: `{ "title": "My test", "models": ["Model One", "Model Two"], "cases": [{ "prompt": "Question", "reference": "Optional reference answer", "responses": ["First model answer", "Second model answer"] }] }`.

Exactly two distinct names and 1–100 paired cases are required. Response order always matches the model list. Names: 80 characters maximum; title: 120; prompt: 12,000; each response: 20,000. Reference and reviewer notes are limited to 12,000 and 4,000 characters. Imported files must be under 5 MB. Invalid imports retain the current session. Text is rendered as text, never as HTML.

## Scoring

Per-case A/B order is randomized with browser cryptographic randomness and retained for the entire session. All three rubric dimensions carry equal weight. Overall score is the arithmetic mean of all criterion scores over scored cases. A case win compares the sums of its three criteria; equal sums are ties. Unscored cases are excluded from aggregates, and results are shown only when the complete suite is scored and revealed. CSV contains case number, model identity, individual rubric scores, mean, and reviewer notes. Formula-like text is prefixed with an apostrophe for spreadsheet safety.

## Privacy and limits

Saved ratings and response content persist in localStorage on this device after save, import, or reveal. Unsubmitted edits are not backed up. Storage can be unavailable or full; the interface reports this and session export remains available. Export before clearing browser data or replacing a run. Session JSON includes model identities, so keep it private during blind review.

Blind labels reduce visible name bias, but are not secure anonymization: names remain in the imported data, browser storage, and exports; response wording may reveal authorship. If you paste the responses yourself, you may already know which is which. For independent review, ask another person to prepare the suite. This is one reviewer’s assessment, not a statistically validated benchmark. No inter-rater agreement, significance testing, live generation, token counting, cost/latency measurement, or independent factual verification is provided. Demo responses and model names are fictional and hand-authored.
