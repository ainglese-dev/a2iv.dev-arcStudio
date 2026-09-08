---
category: pitfall_caveat
confidence: verified
created_at: '2026-09-07T21:53:26.673816+00:00'
exact_quote: VM boot storms regularly saturate host CPU queues, causing BFD and BGP
  keepalives to timeout before automated provisioning completes.
fact_id: fact_clab_boot_02
source_chunk_id: source_containerlab_spine_leaf_chunk_0
source_id: source_containerlab_spine_leaf
tags:
- boot-storm
- eve-ng
- qemu
- cpu-thrash
timestamp_range: null
---

# Fact: Virtual network appliances in EVE-NG suffer from I/O boot st

Virtual network appliances in EVE-NG suffer from I/O boot storms and CPU thrashing during multi-node startup, causing simulated switch interfaces to drop during automated configuration provisioning. ^fact_clab_boot_02

> [!quote] Source Evidence
> VM boot storms regularly saturate host CPU queues, causing BFD and BGP keepalives to timeout before automated provisioning completes.

## Provenance
- **Source**: [[source_containerlab_spine_leaf]]
- **Source Chunk**: `source_containerlab_spine_leaf_chunk_0`
- **Timestamp**: `N/A`
- **Category**: `pitfall_caveat`
- **Confidence**: `verified`