# IncidentGraph

A local security investigation workspace. Import normalized authentication logs, inspect explainable correlations, follow entity relationships, and export a case with evidence.

[Open the live demo](https://tizx2tr3ip-bit.github.io/vibe-coding-project/incidentgraph/)

## Run locally

Requires Node.js 20 or newer. No packages, API keys, accounts, or paid services.

```sh
cd incidentgraph
node server.mjs
```

Open http://127.0.0.1:4173. The server binds only to loopback and serves this directory. Browser processing works identically in the hosted version; the server does not receive imported logs. Do not open index.html directly with a file URL because module loading requires HTTP.

## Try the investigation

1. Select **Privilege change after suspicious login**. The graph and event trail focus on its nine evidence records.
2. Open the last record, EV-0041. Inspect the original role-change record and pin it.
3. Open **Case notebook**, write your observations, and reload. Notes and bookmarks persist on the same browser and origin.
4. Export a Markdown report or portable JSON case. A case file can be reopened from Export case.
5. Open Detection rules and increase the threshold to 30; the sample no longer triggers these rules. Restore it to 5.

The sample has 76 fictional records and three findings. It uses documentation and private network addresses. Its rule matches are not assertions about any real account or system.

## Import contract

JSON arrays, NDJSON (one JSON object per line), and CSV with a header are accepted. Limit: 5 MB / 10,000 input records. Invalid records are listed before import; valid events are analysed. Original input row positions and source objects are retained in the portable case, including rejected records for provenance. CSV types remain strings; JSON formatting is normalized when showing source objects.

| Field | Values |
| --- | --- |
| timestamp | ISO 8601 date/time including Z or a numeric timezone offset |
| action | login, privilege_change, file_access, session_end |
| user | Account identifier, maximum 200 characters |
| source | Source address or name, maximum 200 characters |
| host | Destination host, maximum 200 characters |
| outcome | success or failure |
| details | Optional text; analysis retains the first 2,000 characters, original source remains available |

The included `samples/deployment-incident.json` is suitable for testing file import. Vendor formats such as Windows EVTX or native syslog must first be converted to this schema.

## Detection model

- **Success after failures:** at least 5 failed logins followed by a successful login, on the same source/account/host within 10 minutes. Success clears the rolling failure history for that identity.
- **Multiple account failures:** one source targets at least 5 distinct accounts with failed logins within 10 minutes. Repeated alerts for the same source are suppressed for one window.
- **Privilege change correlation:** a successful privilege change for the same account and host within 30 minutes after a login identified by the first rule.

The first two thresholds and windows are configurable. These are transparent heuristics, not machine learning, threat intelligence, exploit detection, or proof of compromise. Shared networks, legitimate administration, and misconfigured clients can produce these patterns. No detection coverage is claimed beyond these three rules. Graphs display the top five entities per type in the current focus; the event explorer contains all valid records.

## Architecture and data handling

- `core.mjs`: CSV/JSON parsing, normalization, chronological correlation, filtering, synthetic fixture, and report generation. Pure functions shared with tests.
- `app.mjs`: DOM rendering, linked views, dialogs, local persistence, import/export.
- `style.css`: responsive investigation-specific design with keyboard focus indicators.
- `server.mjs`: dependency-free local static server, no ingestion endpoint.

Logs and notes are stored in this origin's localStorage. Other software or people with access to that browser profile may be able to read them. Clear site data to erase the saved case; export first if required. Browser storage limits may prevent persistence of large cases; a visible notice requests an export in that situation. The tool does not encrypt stored cases or implement multi-user access, and is intended for small investigations and portfolio demonstrations rather than production SIEM ingestion. All displayed imported text is escaped or assigned with textContent. Exports contain original input data.

## Tests

```sh
node --test tests/core.test.mjs
```

Tests cover sample findings and benign activity, quoted/multiline CSV, rejected records, timezone ordering, correlation identity/window boundaries, deduplication, composed filters, and reports. Browser checks cover evidence selection, pinning, notes after reload, Markdown download contents, import validation, source row preservation, entity filtering, and rule recalculation.

Keyboard: `/` focuses search; `1`, `2`, `3` switch views outside editable fields. Graph entities are focusable buttons. The event table scrolls horizontally on narrow screens.
