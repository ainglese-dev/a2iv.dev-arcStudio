---
ai_metadata:
  domain: tech
  generator: ai_router
  model: qwen3.8-27b
  provider: openai_compatible
created_at: '2026-09-08T16:44:54.434286+00:00'
deck_id: deck_script_arc_containerlabs_impleme_8fcf6d
metrics:
  cue_coverage_percentage: 100.0
  pacing_alignment_score: 98.5
  variant_a_avg_words_per_slide: 121.8
  variant_a_cognitive_load_score: 100.0
  variant_b_avg_words_per_slide: 50.6
  variant_b_cognitive_load_score: 100.0
script_id: script_arc_containerlabs_implementat_9d112e_ep2_1949dc
script_title: Arc Containerlabs Implementat 9D112E Ep2
slides:
- cue_marker: '[SLIDE: Green demo, broken review; topology diagram with hidden bridge
    and blocked port]'
  duration_s: 30.0
  section_index: 0
  slide_id: slide_script_arc_conta_00
  slide_index: 0
  slide_type: title_hook
  spoken_anchor_text: Your containerlab looks green in the demo, then dies in review
    because two nodes share a hidden bridge, a service waits...
  timestamp_end_s: 30.0
  timestamp_start_s: 0.0
  title: The demo that dies in review
  variant_a:
    badge_pills:
    - containerlab
    - topology
    - failure mode
    bullet_points:
    - Two nodes share a hidden bridge, so traffic appears connected while the intended
      path is never proven.
    - A service waits on a port that never opens, turning a passing UI check into
      a silent runtime failure.
    - Config precedence is unclear, so the post-mortem starts with assumptions about
      isolation instead of evidence.
    code_language: text
    code_snippet: 'demo: green

      review: red

      hidden bridge: node-a <-> node-b

      blocked port: 8443

      config winner: unknown'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Green Demo
      status: passes
      type: surface state
    - label: Hidden Bridge
      status: unintended path
      type: topology defect
    - label: Blocked Port
      status: never opens
      type: service gate
    - label: Config Conflict
      status: undetermined
      type: precedence ambiguity
    headline: The Demo That Dies in Review
    metric_callouts: []
    subhead: 'First steps into containerlabs: a green demo can hide a broken network
      contract.'
    word_count: 105
  variant_b:
    badge_pills:
    - hook
    - topology
    - trust
    bullet_points:
    - A hidden bridge can make two nodes look connected without proving the intended
      contract.
    - A blocked port and unclear config turn a demo into a trust loss.
    code_language: null
    code_snippet: null
    comparison_left:
      color: emerald
      note: Nodes appear reachable and the UI looks healthy.
      status: Green
      title: Demo
    comparison_right:
      color: rose
      note: Hidden bridge, blocked port, and config ambiguity surface.
      status: Broken
      title: Review
    diagram_nodes: []
    headline: Demo Green, Review Red
    metric_callouts:
    - detail: Stakeholder confidence drops when the lab cannot explain itself.
      label: Trust Cost
      value: 1 afternoon
    subhead: The lab must prove the path, not just show a green screen.
    word_count: 54
- cue_marker: '[DIAGRAM: split-screen comparative model; diagram promise versus runtime
    reality with DNS, bridge, port, and startup order labels]'
  duration_s: 70.0
  section_index: 1
  slide_id: slide_script_arc_conta_01
  slide_index: 1
  slide_type: architecture_diagram
  spoken_anchor_text: 'Most first containerlabs fail for the same reason: people copy
    a diagram, paste a compose file, and call it infrastructu...'
  timestamp_end_s: 100.0
  timestamp_start_s: 30.0
  title: Why copied diagrams become time bombs
  variant_a:
    badge_pills:
    - compose
    - DNS
    - startup order
    bullet_points:
    - People copy a diagram, paste a compose file, and call it infrastructure, skipping
      the proof that each edge exists.
    - The diagram says node A talks to node B, but runtime requires DNS resolution,
      bridge existence, port binding, and startup order.
    - When one gate fails, the lab still looks plausible, so debugging starts with
      symptoms instead of the missing contract.
    code_language: text
    code_snippet: "diagram: A -> B\nruntime: if dns resolves\n        and bridge exists\n
      \       and port is bound\n        and service starts in order"
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Diagram Promise
      status: A talks to B
      type: intent
    - label: DNS + Bridge
      status: conditional
      type: network gate
    - label: Port Binding
      status: may already be bound
      type: service gate
    - label: Startup Order
      status: often ignored
      type: readiness gate
    headline: Why Copied Diagrams Become Time Bombs
    metric_callouts: []
    subhead: A diagram is intent; runtime is a set of gates that can fail independently.
    word_count: 119
  variant_b:
    badge_pills:
    - diagram
    - runtime
    - contract
    bullet_points:
    - The diagram states the relationship; the runtime verifies it.
    - If DNS, bridge, port, or order fails, the edge is not real.
    code_language: null
    code_snippet: null
    comparison_left:
      color: indigo
      note: Node A talks to node B.
      status: Intended
      title: Diagram Promise
    comparison_right:
      color: amber
      note: DNS, bridge, port, and startup order must all hold.
      status: Conditional
      title: Runtime Reality
    diagram_nodes: []
    headline: Promise vs Runtime
    metric_callouts:
    - detail: DNS, bridge, port, and startup order.
      label: Runtime Gates
      value: '4'
    subhead: Four gates stand between a copied diagram and a working lab.
    word_count: 47
- cue_marker: '[CODE: minimal containerlab topology snippet with nodes, explicit links,
    healthcheck gate, and negative reachability test]'
  duration_s: 165.0
  section_index: 2
  slide_id: slide_script_arc_conta_02
  slide_index: 2
  slide_type: code_breakdown
  spoken_anchor_text: 'Here is the mental model that keeps a containerlab honest:
    treat it as a small, disposable network, not a pile of contai...'
  timestamp_end_s: 265.0
  timestamp_start_s: 100.0
  title: Build the lab as a disposable network
  variant_a:
    badge_pills:
    - containerlab
    - topology
    - healthcheck
    bullet_points:
    - Every node is a role, every link is a contract, and every service is a behavior
      that must be observable.
    - 'Start with the topology before images: explicit endpoints make the intended
      path visible and testable.'
    - Add a healthcheck gate and a negative reachability test so the lab proves both
      what should work and what should fail.
    code_language: yaml
    code_snippet: "name: lab\ntopology:\n  nodes:\n    node-a:\n      kind: linux\n
      \   node-b:\n      kind: linux\n  links:\n    - endpoints:\n        - node-a:
      eth1\n        - node-b: eth1\nhealthcheck:\n  node-a:\n    command: [\"nc\",
      \"-z\", \"node-b\", \"8443\"]\nnegative_test:\n  command: [\"nc\", \"-z\", \"node-a\",
      \"9999\"]\n  expect: \"fail\""
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Topology
      status: nodes and links
      type: definition
    - label: Explicit Link
      status: endpoint defined
      type: contract
    - label: Healthcheck Gate
      status: service reachable
      type: positive proof
    - label: Negative Test
      status: blocked path fails
      type: negative proof
    headline: Build the Lab as a Disposable Network
    metric_callouts: []
    subhead: Treat the containerlab as a small network with roles, contracts, behaviors,
      and proofs.
    word_count: 126
  variant_b:
    badge_pills:
    - mental model
    - network
    - testing
    bullet_points:
    - Define roles and links before choosing images.
    - Prove the contract with one positive check and one negative check.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Topology First, Images Second
    metric_callouts:
    - detail: Named responsibilities, not anonymous containers.
      label: Nodes
      value: roles
    - detail: Explicit endpoints define the path.
      label: Links
      value: contracts
    - detail: One positive check and one negative check.
      label: Tests
      value: 2 proofs
    subhead: A disposable network is easier to trust when the contract is explicit.
    word_count: 45
- cue_marker: '[SLIDE: Three traps; happy-path, host-leak, config-drift with red X
    and green check comparisons]'
  duration_s: 61.0
  section_index: 3
  slide_id: slide_script_arc_conta_03
  slide_index: 3
  slide_type: comparison_split
  spoken_anchor_text: 'Three traps will bite you fast, and they all look like small
    wins. First, the happy-path trap: you test the path that wo...'
  timestamp_end_s: 326.0
  timestamp_start_s: 265.0
  title: Three traps that make labs lie
  variant_a:
    badge_pills:
    - security
    - network isolation
    - config drift
    bullet_points:
    - 'Happy-path trap: the lab tests the path that works and ignores the path that
      should be blocked, so it becomes a connectivity demo, not a security lab.'
    - 'Host-leak trap: the test passes because traffic escapes to the host network,
      not because the lab topology produced the result.'
    - 'Config-drift trap: a copied config changes between runs, so the lab proves
      an environment that no longer matches the definition.'
    code_language: text
    code_snippet: 'trap: happy-path

      bad: only test A -> B works

      good: test A -> C is blocked


      trap: host-leak

      bad: pass via host network

      good: isolate and verify lab path


      trap: config-drift

      bad: config changes between runs

      good: pin, diff, and rerun'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Happy-Path
      status: red X
      type: test gap
    - label: Host-Leak
      status: red X
      type: network escape
    - label: Config-Drift
      status: red X
      type: definition mismatch
    headline: Three Traps That Make Labs Lie
    metric_callouts: []
    subhead: Small wins can hide missing negative tests, host leakage, and config
      drift.
    word_count: 140
  variant_b:
    badge_pills:
    - pitfalls
    - negative test
    - isolation
    bullet_points:
    - If the lab only proves connectivity, it is a demo, not a security lab.
    - Isolate host leakage and pin config so the result comes from the defined topology.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Only the working path is tested.
      status: Red X
      title: Happy-Path Trap
    comparison_right:
      color: emerald
      note: The blocked path is proven to fail.
      status: Green Check
      title: Negative Test
    diagram_nodes: []
    headline: Test What Should Fail
    metric_callouts:
    - detail: Verify traffic stays inside the lab network.
      label: Host-Leak Guard
      value: 0 escapes
    - detail: Compare config files between runs.
      label: Config-Drift Guard
      value: 1 diff
    subhead: A lab must prove blocked paths, not only working paths.
    word_count: 62
- cue_marker: '[CODE: checklist block; 2 nodes, 1 link, 1 service, 1 negative test,
    run twice, compare output]'
  duration_s: 34.0
  section_index: 4
  slide_id: slide_script_arc_conta_04
  slide_index: 4
  slide_type: key_takeaway
  spoken_anchor_text: Build one small lab today. Define two nodes, one link, one service,
    and one negative test. Make the topology explicit. M...
  timestamp_end_s: 360.0
  timestamp_start_s: 326.0
  title: Prove the contract today
  variant_a:
    badge_pills:
    - checklist
    - reproducibility
    - containerlab
    bullet_points:
    - Define two nodes, one explicit link, one service, and one negative test so the
      smallest contract is fully specified.
    - Make the topology explicit, the health check real, and the failure visible instead
      of hidden inside a running container.
    - Run the lab twice and compare output; if the second run matches the first, the
      definition is stable enough to extend.
    code_language: markdown
    code_snippet: '- [ ] 2 nodes

      - [ ] 1 explicit link

      - [ ] 1 service

      - [ ] 1 negative test

      - [ ] run twice

      - [ ] compare output'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Define
      status: 2 nodes, 1 link, 1 service
      type: contract
    - label: Test
      status: positive and negative
      type: proof
    - label: Run Twice
      status: same definition
      type: reproducibility
    - label: Compare
      status: output matches
      type: verification
    headline: Prove the Contract Today
    metric_callouts: []
    subhead: Build one small lab that can be rerun and compared without guessing.
    word_count: 119
  variant_b:
    badge_pills:
    - action
    - checklist
    - proof
    bullet_points:
    - Build the smallest lab that can prove a service and a blocked path.
    - Rerun it and compare output before adding complexity.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Small Lab, Real Proof
    metric_callouts:
    - detail: Explicit roles, not anonymous containers.
      label: Nodes
      value: '2'
    - detail: A single contract to verify.
      label: Link
      value: '1'
    - detail: Proof that the blocked path fails.
      label: Negative Test
      value: '1'
    subhead: One explicit contract is better than a large unproven diagram.
    word_count: 45
total_duration_s: 360.0
total_slides: 5
---

# Presentation Deck: Arc Containerlabs Implementat 9D112E Ep2

> [!abstract] Presentation Deck Overview
> - **Deck ID**: `deck_script_arc_containerlabs_impleme_8fcf6d` | **Script ID**: `[[scripts/script_arc_containerlabs_implementat_9d112e_ep2_1949dc|script_arc_containerlabs_implementat_9d112e_ep2_1949dc]]`
> - **Slide Count**: 5 slides | **Total Duration**: 06:00 (360.0s)
> - **Cue Coverage**: 100.0% | **Pacing Alignment**: 98.5%
>
> ### A/B Comparative Benchmarks
> - **Variant A (Terminal Dark)**: Words/Slide: **121.8** | Cognitive Load: **100.0/100**
> - **Variant B (Infographic Clean)**: Words/Slide: **50.6** | Cognitive Load: **100.0/100**

---

## Slide 1: Demo Green, Review Red `^slide_script_arc_conta_00`
- **Type**: `title_hook` | **Section**: 1 | **Time**: 00:00 - 00:30 (30.0s)
- **Cue Marker**: `[SLIDE: Green demo, broken review; topology diagram with hidden bridge and blocked port]`

> [!quote] Spoken Teleprompter Anchor
> "Your containerlab looks green in the demo, then dies in review because two nodes share a hidden bridge, a service waits..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `The Demo That Dies in Review`
> **Subhead**: First steps into containerlabs: a green demo can hide a broken network contract.
> ```text
> demo: green
> review: red
> hidden bridge: node-a <-> node-b
> blocked port: 8443
> config winner: unknown
> ```
> - `Two nodes share a hidden bridge, so traffic appears connected while the intended path is never proven.`
> - `A service waits on a port that never opens, turning a passing UI check into a silent runtime failure.`
> - `Config precedence is unclear, so the post-mortem starts with assumptions about isolation instead of evidence.`
> `[containerlab]`
> `[topology]`
> `[failure mode]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Demo Green, Review Red
> **Subhead**: *The lab must prove the path, not just show a green screen.*
>
> | Demo | Review |
> | :--- | :--- |
> | `Green` | `Broken` |
>
> - A hidden bridge can make two nodes look connected without proving the intended contract.
> - A blocked port and unclear config turn a demo into a trust loss.
> **Trust Cost**: `1 afternoon` ()

---

## Slide 2: Promise vs Runtime `^slide_script_arc_conta_01`
- **Type**: `architecture_diagram` | **Section**: 2 | **Time**: 00:30 - 01:40 (70.0s)
- **Cue Marker**: `[DIAGRAM: split-screen comparative model; diagram promise versus runtime reality with DNS, bridge, port, and startup order labels]`

> [!quote] Spoken Teleprompter Anchor
> "Most first containerlabs fail for the same reason: people copy a diagram, paste a compose file, and call it infrastructu..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Why Copied Diagrams Become Time Bombs`
> **Subhead**: A diagram is intent; runtime is a set of gates that can fail independently.
> ```text
> diagram: A -> B
> runtime: if dns resolves
>         and bridge exists
>         and port is bound
>         and service starts in order
> ```
> - `People copy a diagram, paste a compose file, and call it infrastructure, skipping the proof that each edge exists.`
> - `The diagram says node A talks to node B, but runtime requires DNS resolution, bridge existence, port binding, and startup order.`
> - `When one gate fails, the lab still looks plausible, so debugging starts with symptoms instead of the missing contract.`
> `[compose]`
> `[DNS]`
> `[startup order]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Promise vs Runtime
> **Subhead**: *Four gates stand between a copied diagram and a working lab.*
>
> | Diagram Promise | Runtime Reality |
> | :--- | :--- |
> | `Intended` | `Conditional` |
>
> - The diagram states the relationship; the runtime verifies it.
> - If DNS, bridge, port, or order fails, the edge is not real.
> **Runtime Gates**: `4` ()

---

## Slide 3: Topology First, Images Second `^slide_script_arc_conta_02`
- **Type**: `code_breakdown` | **Section**: 3 | **Time**: 01:40 - 04:25 (165.0s)
- **Cue Marker**: `[CODE: minimal containerlab topology snippet with nodes, explicit links, healthcheck gate, and negative reachability test]`

> [!quote] Spoken Teleprompter Anchor
> "Here is the mental model that keeps a containerlab honest: treat it as a small, disposable network, not a pile of contai..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Build the Lab as a Disposable Network`
> **Subhead**: Treat the containerlab as a small network with roles, contracts, behaviors, and proofs.
> ```yaml
> name: lab
> topology:
>   nodes:
>     node-a:
>       kind: linux
>     node-b:
>       kind: linux
>   links:
>     - endpoints:
>         - node-a: eth1
>         - node-b: eth1
> healthcheck:
>   node-a:
>     command: ["nc", "-z", "node-b", "8443"]
> negative_test:
>   command: ["nc", "-z", "node-a", "9999"]
>   expect: "fail"
> ```
> - `Every node is a role, every link is a contract, and every service is a behavior that must be observable.`
> - `Start with the topology before images: explicit endpoints make the intended path visible and testable.`
> - `Add a healthcheck gate and a negative reachability test so the lab proves both what should work and what should fail.`
> `[containerlab]`
> `[topology]`
> `[healthcheck]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Topology First, Images Second
> **Subhead**: *A disposable network is easier to trust when the contract is explicit.*
> - Define roles and links before choosing images.
> - Prove the contract with one positive check and one negative check.
> **Nodes**: `roles` ()
> **Links**: `contracts` ()
> **Tests**: `2 proofs` ()

---

## Slide 4: Test What Should Fail `^slide_script_arc_conta_03`
- **Type**: `comparison_split` | **Section**: 4 | **Time**: 04:25 - 05:26 (61.0s)
- **Cue Marker**: `[SLIDE: Three traps; happy-path, host-leak, config-drift with red X and green check comparisons]`

> [!quote] Spoken Teleprompter Anchor
> "Three traps will bite you fast, and they all look like small wins. First, the happy-path trap: you test the path that wo..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Three Traps That Make Labs Lie`
> **Subhead**: Small wins can hide missing negative tests, host leakage, and config drift.
> ```text
> trap: happy-path
> bad: only test A -> B works
> good: test A -> C is blocked
> 
> trap: host-leak
> bad: pass via host network
> good: isolate and verify lab path
> 
> trap: config-drift
> bad: config changes between runs
> good: pin, diff, and rerun
> ```
> - `Happy-path trap: the lab tests the path that works and ignores the path that should be blocked, so it becomes a connectivity demo, not a security lab.`
> - `Host-leak trap: the test passes because traffic escapes to the host network, not because the lab topology produced the result.`
> - `Config-drift trap: a copied config changes between runs, so the lab proves an environment that no longer matches the definition.`
> `[security]`
> `[network isolation]`
> `[config drift]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Test What Should Fail
> **Subhead**: *A lab must prove blocked paths, not only working paths.*
>
> | Happy-Path Trap | Negative Test |
> | :--- | :--- |
> | `Red X` | `Green Check` |
>
> - If the lab only proves connectivity, it is a demo, not a security lab.
> - Isolate host leakage and pin config so the result comes from the defined topology.
> **Host-Leak Guard**: `0 escapes` ()
> **Config-Drift Guard**: `1 diff` ()

---

## Slide 5: Small Lab, Real Proof `^slide_script_arc_conta_04`
- **Type**: `key_takeaway` | **Section**: 5 | **Time**: 05:26 - 06:00 (34.0s)
- **Cue Marker**: `[CODE: checklist block; 2 nodes, 1 link, 1 service, 1 negative test, run twice, compare output]`

> [!quote] Spoken Teleprompter Anchor
> "Build one small lab today. Define two nodes, one link, one service, and one negative test. Make the topology explicit. M..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Prove the Contract Today`
> **Subhead**: Build one small lab that can be rerun and compared without guessing.
> ```markdown
> - [ ] 2 nodes
> - [ ] 1 explicit link
> - [ ] 1 service
> - [ ] 1 negative test
> - [ ] run twice
> - [ ] compare output
> ```
> - `Define two nodes, one explicit link, one service, and one negative test so the smallest contract is fully specified.`
> - `Make the topology explicit, the health check real, and the failure visible instead of hidden inside a running container.`
> - `Run the lab twice and compare output; if the second run matches the first, the definition is stable enough to extend.`
> `[checklist]`
> `[reproducibility]`
> `[containerlab]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Small Lab, Real Proof
> **Subhead**: *One explicit contract is better than a large unproven diagram.*
> - Build the smallest lab that can prove a service and a blocked path.
> - Rerun it and compare output before adding complexity.
> **Nodes**: `2` ()
> **Link**: `1` ()
> **Negative Test**: `1` ()

---