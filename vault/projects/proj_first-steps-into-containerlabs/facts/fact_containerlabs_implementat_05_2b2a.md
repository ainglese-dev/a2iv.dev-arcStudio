---
category: workflow_step
confidence: verified
created_at: '2026-09-08T14:51:48.051926+00:00'
exact_quote: set a small MTU on one veth, send a large UDP packet, and verify whether
  ICMP fragmentation needed appears.
fact_id: fact_containerlabs_implementat_05_2b2a
source_chunk_id: src_seed_containerlabs_implementat_f27d6b_chunk_1
source_id: src_seed_containerlabs_implementat_f27d6b
tags:
- mtu
- packet-drops
- tcpdump
- practitioner
timestamp_range: null
---

# Fact: MTU truncation can be tested by lowering a veth MTU and chec

MTU truncation can be tested by lowering a veth MTU and checking for ICMP fragmentation needed. ^fact_containerlabs_implementat_05_2b2a

> [!quote] Source Evidence
> set a small MTU on one veth, send a large UDP packet, and verify whether ICMP fragmentation needed appears.

## Provenance
- **Source**: [[src_seed_containerlabs_implementat_f27d6b]]
- **Source Chunk**: `src_seed_containerlabs_implementat_f27d6b_chunk_1`
- **Timestamp**: `N/A`
- **Category**: `workflow_step`
- **Confidence**: `verified`