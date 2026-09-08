---
category: pitfall_caveat
confidence: verified
created_at: '2026-09-08T14:51:48.051926+00:00'
exact_quote: If the PC lacks CAP_NET_ADMIN, or the user is inside a nested VM without
  proper privileges, nodes may start but fail to create veth pairs.
fact_id: fact_containerlabs_implementat_06_06eb
source_chunk_id: src_seed_containerlabs_implementat_f27d6b_chunk_2
source_id: src_seed_containerlabs_implementat_f27d6b
tags:
- permissions
- nested-vm
- veth
- practitioner
timestamp_range: null
---

# Fact: Containerlab requires host kernel privileges and can fail to

Containerlab requires host kernel privileges and can fail to create veth pairs in restricted or nested environments. ^fact_containerlabs_implementat_06_06eb

> [!quote] Source Evidence
> If the PC lacks CAP_NET_ADMIN, or the user is inside a nested VM without proper privileges, nodes may start but fail to create veth pairs.

## Provenance
- **Source**: [[src_seed_containerlabs_implementat_f27d6b]]
- **Source Chunk**: `src_seed_containerlabs_implementat_f27d6b_chunk_2`
- **Timestamp**: `N/A`
- **Category**: `pitfall_caveat`
- **Confidence**: `verified`