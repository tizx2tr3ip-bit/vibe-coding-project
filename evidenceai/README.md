# EvidenceAI

A dark document research workspace with source-linked retrieval, local AI answers, source inspection, a research notebook, and retrieval evaluation.

[Open the public demo](https://tizx2tr3ip-bit.github.io/vibe-coding-project/evidenceai/) · [Download the local project](https://tizx2tr3ip-bit.github.io/vibe-coding-project/downloads/evidenceai.zip)

## Two working modes

| Mode | Processing | Requirements |
| --- | --- | --- |
| Evidence search | BM25 ranks source passages; displayed excerpts are copied from those passages | Browser only; works on the public demo and with imported TXT/Markdown |
| Local AI answer | A local chat model synthesizes retrieved evidence into claims; citation IDs and verbatim quotes are checked | Local Node server, Ollama, installed chat model |
| Hybrid retrieval | Combines BM25 and local embedding cosine rankings through reciprocal rank fusion | Local server, Ollama, installed embedding model |

The public demo does not pretend to run a model. It uses a labelled fictional collection with a revised launch decision that contradicts an earlier date. The local version provides actual model inference through Ollama; no API key or paid service is required.

## Local setup

1. Install [Node.js](https://nodejs.org/) 20 or newer and [Ollama for Windows, macOS or Linux](https://ollama.com/download).
2. Download two local models. These examples keep memory and download requirements modest:

```sh
ollama pull qwen2.5:3b
ollama pull all-minilm
```

3. Keep Ollama running. Start EvidenceAI from its extracted directory:

```sh
node server.mjs
```

4. Open **http://127.0.0.1:4174**. Open Model connection, connect, choose `qwen2.5:3b` for chat and `all-minilm:latest` for embeddings. Choose Local AI answer and Hybrid + embeddings. The interface also detects this model pair automatically when available locally.
5. Ask “When is the public beta launching, and why did the date change?” Inspect the cited passages before relying on the answer.

No npm installation is needed. The Node server binds only to loopback. It proxies only model listing, embedding, and chat requests to `127.0.0.1:11434`; it does not expose a configurable arbitrary upstream URL in the UI.

For strictly local model processing, start Ollama with `OLLAMA_NO_CLOUD=1`. In PowerShell:

```powershell
$env:OLLAMA_NO_CLOUD = '1'
ollama serve
```

If Ollama is already running, stop that instance before starting one with the new setting. Do not expose either server to your network. See [Ollama's local-only configuration](https://docs.ollama.com/faq#how-do-i-disable-ollamas-cloud-features).

## Using the workspace

- Add UTF-8 `.txt`, `.md`, or `.markdown` documents, or paste text. Limits: 30 documents, 150,000 characters per document, 1 million characters per workspace. PDF, DOCX, OCR, and images are not parsed in this version.
- Check sources in the library to control the search scope. Click a title to read it without changing the scope.
- Select 3, 5, or 8 passages. Inspect the retrieval trace to see ranking scores. Scores are not confidence percentages.
- Click a citation to highlight its exact quoted text in a saved source snapshot, including the original line number.
- Save up to ten research results to the notebook. Saved results retain their source documents, so removing a source from future searches does not rewrite past evidence.
- Export Markdown briefs, notebook notes, evaluation results, or a portable workspace JSON. “Open workspace” restores documents, saved research, and notes after validation.
- Ctrl+Enter submits the question. Cancel stops the browser request; the local proxy also aborts its upstream request when the connection closes.

## Retrieval and citation checks

`core.mjs` splits documents into overlapping passages (approximately 1,100 characters, 160-character overlap), preserving source offsets and line numbers. BM25 uses corpus document frequencies, term frequencies, and length normalization. Hybrid mode ranks local embeddings by cosine similarity and combines semantic and lexical rankings using reciprocal rank fusion with k=60. Embeddings are cached in memory for the current corpus/model.

The generation prompt treats document content as untrusted evidence. The model returns a structured JSON answer. Claims without citation IDs present in the retrieved evidence, or with quotations that are not exact contiguous matches, are withheld. The interface reports how many claims were withheld. An explicit insufficient-evidence answer produces no claims.

**These checks do not establish semantic correctness.** A model can accurately quote a passage while misinterpreting it. Small models may miss contradictions, produce incomplete answers, or fail the output schema. Review cited sources and date/version context. This is a research aid, not an autonomous fact checker. Prompt-injection instructions are separated from system instructions, but prompt instructions are not a security guarantee.

## Evaluation

The Evaluation tab accepts `question / expected-document-id` lines and reports source hit rate at five passages and mean reciprocal rank. It uses all current workspace documents and BM25 only. The five included sample cases are sanity checks, not an independent benchmark or a claim of real-world accuracy. You can define your own cases and export results.

```sh
node --test tests/*.test.mjs
```

Unit tests cover source offsets, scope, unrelated queries, revised-date retrieval, exact excerpts, vector dimensions, rank fusion, fabricated citations, insufficient evidence, reports, and metrics. Server tests use an explicitly simulated model endpoint to verify request contracts, origin checks, rejected requests, and unavailable-service errors. Real model behavior must additionally be verified on the local installation.

## Privacy and storage

The public browser version performs text retrieval locally. Documents, notebook entries, and source snapshots are stored in this origin's localStorage. If storage is full, the interface asks you to export the workspace. Anyone with access to the browser profile may be able to read stored research. Clear site data to erase it. Export files include source text and notes.

In local model mode, source passages are sent through the loopback Node server to Ollama. Use only local model weights; the local installation configured for this project disables Ollama cloud features. No analytics, remote font services, external search, telemetry SDK, or CDN dependency is included in the project code.

## Implementation

- `core.mjs`: chunking, BM25, cosine similarity, fusion, prompts, citation validation, evaluation, and export formatting.
- `app.mjs`: document import, source reader, snapshots, notebook, model connection, cancellable queries, and persistence.
- `server.mjs`: static serving and restricted same-origin Ollama proxy.
- `samples.mjs`: fictional source corpus and retrieval sanity cases.
- `tests/`: deterministic processing and local connector tests.

The optional model connector follows Ollama's official [chat](https://docs.ollama.com/api/chat), [embedding](https://docs.ollama.com/api/embed), and [model-list](https://docs.ollama.com/api/tags) APIs. Example model details: [Qwen2.5 3B](https://ollama.com/library/qwen2.5:3b), [all-minilm](https://ollama.com/library/all-minilm).

## Local model verification

On 13 November 2026, the local workflow was exercised with Qwen2.5 3B and all-minilm. Hybrid retrieval surfaced both the original launch brief and the revised decision. The generated answer correctly stated the revised 2 May date and the deletion-verification reason, with exact source quotes accepted by the validator. A warm chat request took about five seconds; the browser workflow with model switching and embeddings took about eighteen seconds on the test computer. Timing varies by hardware and memory pressure. These are functional smoke checks, not a model accuracy benchmark.
