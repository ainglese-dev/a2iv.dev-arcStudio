---
category: architecture_decision
confidence: inferred
created_at: '2026-09-08T15:36:59.146019+00:00'
exact_quote: Do not enable aggressive caching, stale-while-revalidate, or always-online
  behavior as a first step.
fact_id: fact_first_steps_into_cloudfla_07_3745
source_chunk_id: src_seed_first_steps_into_cloudfla_0adf8c_chunk_5
source_id: src_seed_first_steps_into_cloudfla_0adf8c
tags:
- cdn
- caching
- failure-visibility
- practitioner
timestamp_range: null
---

# Fact: Aggressive caching and always-online behavior should not be 

Aggressive caching and always-online behavior should not be enabled as a first step because they can mask origin degradation. ^fact_first_steps_into_cloudfla_07_3745

> [!quote] Source Evidence
> Do not enable aggressive caching, stale-while-revalidate, or always-online behavior as a first step.

## Provenance
- **Source**: [[src_seed_first_steps_into_cloudfla_0adf8c]]
- **Source Chunk**: `src_seed_first_steps_into_cloudfla_0adf8c_chunk_5`
- **Timestamp**: `N/A`
- **Category**: `architecture_decision`
- **Confidence**: `inferred`