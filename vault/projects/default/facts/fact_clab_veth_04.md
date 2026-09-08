---
category: architecture_decision
confidence: verified
created_at: '2026-09-07T21:53:26.673816+00:00'
exact_quote: By plumbing veth pairs directly between container netns, inter-switch
  latency drops to microsecond levels without MTU fragmentation.
fact_id: fact_clab_veth_04
source_chunk_id: source_containerlab_spine_leaf_chunk_2
source_id: source_containerlab_spine_leaf
tags:
- veth
- kernel
- netns
- mtu
timestamp_range: null
---

# Fact: Containerlab leverages Linux kernel virtual ethernet (veth) 

Containerlab leverages Linux kernel virtual ethernet (veth) pairs directly between network namespaces, eliminating hypervisor bridge overhead and MTU truncation bugs common to nested QEMU taps. ^fact_clab_veth_04

> [!quote] Source Evidence
> By plumbing veth pairs directly between container netns, inter-switch latency drops to microsecond levels without MTU fragmentation.

## Provenance
- **Source**: [[source_containerlab_spine_leaf]]
- **Source Chunk**: `source_containerlab_spine_leaf_chunk_2`
- **Timestamp**: `N/A`
- **Category**: `architecture_decision`
- **Confidence**: `verified`