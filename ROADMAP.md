# Portfolio rebuild

Free local projects, public sample-data demonstrations, one repository. Each project receives its own task-oriented design. Complete and review one at a time.

| Project | Field | Status |
| --- | --- | --- |
| IncidentGraph | Security investigation | Implemented v1; ready for user review |
| EvidenceAI | Document retrieval and cited AI answers | Implemented v1; real local model verified |
| ForecastForge | Predictive analytics | Implemented v1; ready for user review |
| ModelArena | AI evaluation | Implemented v1; ready for user review |
| VisionBench | Computer vision | Planned |
| SignalWatch | Time-series anomaly detection | Planned |
| ThreatCanvas | Security architecture | Planned |
| DependencyRadar | Software supply-chain security | Planned |
| PacketScope | Network forensics | Planned |
| ExperimentLab | Advanced statistics | Planned |
| RoomCraft | Interior design | Planned |
| CutRoom | Filmmaking | Planned |
| BeatFoundry | Music | Planned |
| PhotoSelect | Photography | Planned |
| BranchQuest | Game design | Planned |
| QuoteWorks | Freelancing | Planned |
| Stockroom | Retail | Planned |
| MenuMargin | Hospitality | Planned |
| RunOfShow | Event production | Planned |
| ScopeSite | Construction | Planned |

## Resume notes

The previous 25 projects were rejected by the owner and are being replaced. They remain recoverable through Git history; they are not part of the new portfolio. Do not restore them or duplicate a shared visual template.

IncidentGraph uses no dependencies or external services. Run `node incidentgraph/server.mjs`; tests: `node --test incidentgraph/tests/core.test.mjs`. First obtain user feedback on the actual project before starting the next. Continue improving functional depth, usability, and honest technical documentation; do not label planned features as implemented.

EvidenceAI uses dependency-free Node and optional Ollama models. Run `node evidenceai/server.mjs`; tests: `node --test evidenceai/tests/*.test.mjs`. Public Pages runs lexical evidence search; local mode provides chat and embeddings. The owner approved continuing project by project on 23 November 2026. ForecastForge is the next completed addition.

ForecastForge uses dependency-free browser calculations and an optional Node static server. Run `node forecastforge/server.mjs`; tests: `node --test forecastforge/tests/*.test.mjs`. Includes CSV validation, four baselines, fixed holdout evaluation, scenario adjustment and CSV export. No uncertainty intervals or learned AI model is claimed. The owner approved proceeding to ModelArena.


ModelArena provides browser-local paired human evaluation with randomized A/B presentation, a three-criterion rubric, local session persistence, suite/session imports, identity reveal after all cases are scored, and CSV/session exports. Demo models and responses are fictional. Run `node modelarena/server.mjs`; tests: `node --test modelarena/tests/*.test.mjs`. Review ModelArena before starting VisionBench.
