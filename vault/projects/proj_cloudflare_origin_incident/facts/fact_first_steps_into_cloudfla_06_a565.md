---
category: pitfall_caveat
confidence: inferred
created_at: '2026-09-08T15:36:59.146019+00:00'
exact_quote: The symptom is not a clean 502; it is a request that stalls, retries,
  and eventually times out.
fact_id: fact_first_steps_into_cloudfla_06_a565
source_chunk_id: src_seed_first_steps_into_cloudfla_0adf8c_chunk_4
source_id: src_seed_first_steps_into_cloudfla_0adf8c
tags:
- mtu
- network
- intermittent-failure
- practitioner
timestamp_range: null
---

# Fact: MTU truncation can cause intermittent request hangs rather t

MTU truncation can cause intermittent request hangs rather than clean HTTP errors when packets are dropped on carrier paths. ^fact_first_steps_into_cloudfla_06_a565

> [!quote] Source Evidence
> The symptom is not a clean 502; it is a request that stalls, retries, and eventually times out.

## Provenance
- **Source**: [[src_seed_first_steps_into_cloudfla_0adf8c]]
- **Source Chunk**: `src_seed_first_steps_into_cloudfla_0adf8c_chunk_4`
- **Timestamp**: `N/A`
- **Category**: `pitfall_caveat`
- **Confidence**: `inferred`