---
category: pitfall_caveat
confidence: inferred
created_at: '2026-09-08T15:36:59.146019+00:00'
exact_quote: The cache then stores the first user's payload and returns it to others.
fact_id: fact_first_steps_into_cloudfla_04_dfc3
source_chunk_id: src_seed_first_steps_into_cloudfla_0adf8c_chunk_2
source_id: src_seed_first_steps_into_cloudfla_0adf8c
tags:
- cdn
- caching
- data-leak
- practitioner
timestamp_range: null
---

# Fact: Caching personalized GET responses without explicit no-store

Caching personalized GET responses without explicit no-store can expose one user's payload to other users. ^fact_first_steps_into_cloudfla_04_dfc3

> [!quote] Source Evidence
> The cache then stores the first user's payload and returns it to others.

## Provenance
- **Source**: [[src_seed_first_steps_into_cloudfla_0adf8c]]
- **Source Chunk**: `src_seed_first_steps_into_cloudfla_0adf8c_chunk_2`
- **Timestamp**: `N/A`
- **Category**: `pitfall_caveat`
- **Confidence**: `inferred`