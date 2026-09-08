---
ai_metadata:
  domain: tech
  generator: ai_router
  model: qwen3.8-27b
  provider: openai_compatible
created_at: '2026-09-08T17:11:52.174010+00:00'
deck_id: deck_script_arc_containerlabs_impleme_3be4db
metrics:
  cue_coverage_percentage: 100.0
  pacing_alignment_score: 98.5
  variant_a_avg_words_per_slide: 119.2
  variant_a_cognitive_load_score: 100.0
  variant_b_avg_words_per_slide: 50.2
  variant_b_cognitive_load_score: 100.0
script_id: script_arc_containerlabs_implementat_9d112e_ep3_d3f292
script_title: Arc Containerlabs Implementat 9D112E Ep3
slides:
- cue_marker: '[SLIDE: Title: Container Lab Failure, key text: Green demo, broken
    cluster, fix assumptions]'
  duration_s: 30.0
  section_index: 0
  slide_id: slide_script_arc_conta_00
  slide_index: 0
  slide_type: title_hook
  spoken_anchor_text: Your container lab looks green in the demo, then dies in the
    real cluster. Nodes lose network, volumes vanish, and the o...
  timestamp_end_s: 30.0
  timestamp_start_s: 0.0
  title: The Lab That Dies in the Real Cluster
  variant_a:
    badge_pills:
    - Container Labs
    - Failure Modes
    - Cluster Readiness
    bullet_points:
    - Demo state can look green while the real cluster loses node network, volume
      state, and recovery ownership.
    - Nodes can drop network paths and volumes can vanish, leaving only an unwritten
      log line as the first clue.
    - 'Debugging shifts from application code to lab assumptions: host paths, network
      names, storage mounts, and restart behavior.'
    code_language: text
    code_snippet: 'demo: dashboard green

      cluster: node0 network down

      volume: /var/lib/containerlab missing

      log: no owner, no recovery path'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Green demo
      status: healthy
      type: state
    - label: Broken cluster
      status: failed
      type: state
    headline: 'Container Lab Failure: Green Demo, Broken Cluster'
    metric_callouts:
    - detail: Browser dashboard reachable
      label: Demo signal
      value: Green
    subhead: The lab is not failing because of code; it is failing because the assumptions
      were never tested.
    word_count: 108
  variant_b:
    badge_pills:
    - Container Labs
    - Failure Modes
    bullet_points:
    - A green dashboard does not prove the lab survives node or storage failure.
    - Build the lab with explicit network, volume, and recovery checks before trusting
      it.
    code_language: null
    code_snippet: null
    comparison_left:
      color: emerald
      note: Dashboard reachable, containers running
      status: Looks healthy
      title: Green Demo
    comparison_right:
      color: rose
      note: Network lost, volumes vanish, no recovery owner
      status: Broken
      title: Real Cluster
    diagram_nodes: []
    headline: Green Demo vs Broken Cluster
    metric_callouts:
    - detail: No owner, no recovery path
      label: Failure clue
      value: 1 log line
    subhead: Stop guessing; fix the lab assumptions now.
    word_count: 54
- cue_marker: '[DIAGRAM: split-screen: tutorial lab vs production reality, labels:
    host, network, volume, scheduler, operator]'
  duration_s: 70.0
  section_index: 1
  slide_id: slide_script_arc_conta_01
  slide_index: 1
  slide_type: comparison_split
  spoken_anchor_text: Most first container labs fail because they copy a tutorial
    and call it infrastructure. You spin up a few containers, po...
  timestamp_end_s: 100.0
  timestamp_start_s: 30.0
  title: Why Tutorial Labs Break in Reality
  variant_a:
    badge_pills:
    - Tutorial Lab
    - Production Reality
    - State Ownership
    bullet_points:
    - Tutorial labs often spin up containers and point a browser at a dashboard, then
      assume the host and network are stable.
    - Production reality includes node failure, volume loss, scheduler rescheduling,
      and operator ownership of state.
    - Without a node failure story, storage recovery path, and clear owner, the lab
      breaks silently when the environment changes.
    code_language: text
    code_snippet: 'tutorial: docker compose up

      production: node failure, volume loss, scheduler reschedule

      missing: failure story, recovery path, state owner'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Host
      status: assumed stable
      type: dependency
    - label: Network
      status: unstable
      type: dependency
    - label: Volume
      status: no recovery
      type: state
    - label: Scheduler / Operator
      status: no owner
      type: control
    headline: Why Tutorial Labs Break in Reality
    metric_callouts:
    - detail: No node failure story
      label: Assumed stability
      value: None
    subhead: A copied tutorial is not infrastructure until it has a failure story,
      storage recovery path, and state owner.
    word_count: 115
  variant_b:
    badge_pills:
    - Tutorial Lab
    - Production Reality
    bullet_points:
    - Tutorial labs assume stable host, network, and storage.
    - Production reality requires failure handling, recovery, and ownership.
    code_language: null
    code_snippet: null
    comparison_left:
      color: amber
      note: Containers up, dashboard visible
      status: Assumes stability
      title: Tutorial Lab
    comparison_right:
      color: rose
      note: Node loss, volume loss, scheduler action
      status: Fails under change
      title: Production Reality
    diagram_nodes: []
    headline: Tutorial Lab vs Production Reality
    metric_callouts:
    - detail: No recovery path or owner
      label: Missing model
      value: Failure story
    subhead: The gap is not the container; it is the missing failure model.
    word_count: 50
- cue_marker: '[CODE: lab topology snippet: node, volume, network, health endpoint,
    labels, restart policy]'
  duration_s: 150.0
  section_index: 2
  slide_id: slide_script_arc_conta_02
  slide_index: 2
  slide_type: code_breakdown
  spoken_anchor_text: 'Here is the mental model. A container lab is a small, repeatable
    system with four layers: compute, network, storage, and...'
  timestamp_end_s: 250.0
  timestamp_start_s: 100.0
  title: Build the Smallest Lab That Can Be Trusted
  variant_a:
    badge_pills:
    - Lab Topology
    - Restart Policy
    - Health Endpoint
    bullet_points:
    - Compute defines the container runtime and the host resources it can use, so
      the lab does not depend on an untracked machine.
    - Network defines how containers reach each other, how they reach the outside
      world, and what happens when a path disappears.
    - Storage and observability make state recoverable and health checkable, so a
      restart can be verified instead of guessed.
    code_language: yaml
    code_snippet: "lab:\n  node:\n    image: pinned:1.0\n    restart: unless-stopped\n
      \   labels:\n      env: lab\n      owner: platform\n  network:\n    type: bridge\n
      \   name: lab-net\n  volume:\n    name: lab-state\n    mount: /data\n  health:\n
      \   endpoint: /healthz\n    checks:\n      - data-access"
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Compute
      status: runtime + host resources
      type: layer
    - label: Network
      status: internal + external reach
      type: layer
    - label: Storage
      status: persistent volume
      type: layer
    - label: Observability
      status: health endpoint
      type: layer
    headline: Build the Smallest Lab That Can Be Trusted
    metric_callouts:
    - detail: Compute, network, storage, observability
      label: Trusted layers
      value: '4'
    subhead: Treat the lab as a small, repeatable system with compute, network, storage,
      and observability.
    word_count: 126
  variant_b:
    badge_pills:
    - Lab Topology
    - Health Endpoint
    bullet_points:
    - Pin the image, define the network, and persist the volume.
    - Use a health endpoint that checks data access, not just process uptime.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Four Layers of a Trusted Lab
    metric_callouts:
    - detail: Compute, network, storage, observability
      label: Trusted layers
      value: '4'
    - detail: Checks data access
      label: Recovery signal
      value: /healthz
    subhead: Keep the lab small enough to inspect and repeat.
    word_count: 47
- cue_marker: '[DIAGRAM: failure mode map: laptop-only paths, dashboard truth, complexity
    before failure test]'
  duration_s: 65.0
  section_index: 3
  slide_id: slide_script_arc_conta_03
  slide_index: 3
  slide_type: architecture_diagram
  spoken_anchor_text: Three pitfalls will catch you. First, you build a lab that only
    works on your laptop. The network names, host paths, and...
  timestamp_end_s: 315.0
  timestamp_start_s: 250.0
  title: Failure Modes That Catch Experienced Practitioners
  variant_a:
    badge_pills:
    - Failure Modes
    - Portability
    - Health Checks
    bullet_points:
    - Laptop-only paths hardcode local network names, host paths, and DNS entries,
      so the lab breaks when moved to another machine.
    - Treating the dashboard as the source of truth hides backend failure; a green
      UI can exist while the service is down.
    - Adding complexity before a failure test hides recovery gaps, because the lab
      has not proven it can survive a node stop or restart.
    code_language: text
    code_snippet: 'pitfall 1: host path /Users/.../lab

      pitfall 2: dashboard green, backend down

      pitfall 3: add scheduler before node restart test'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Laptop-only paths
      status: local
      type: pitfall
    - label: Dashboard truth
      status: misleading
      type: pitfall
    - label: Complexity before failure test
      status: untested
      type: pitfall
    headline: Failure Modes That Catch Experienced Practitioners
    metric_callouts:
    - detail: Local paths, dashboard truth, premature complexity
      label: Pitfalls
      value: '3'
    subhead: Three pitfalls turn a working demo into a fragile lab.
    word_count: 117
  variant_b:
    badge_pills:
    - Failure Modes
    - Health Checks
    bullet_points:
    - A dashboard can look green while the backend is down.
    - A health endpoint that checks data access gives a reliable failure signal.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Green UI while backend is down
      status: Misleading
      title: Dashboard Truth
    comparison_right:
      color: emerald
      note: Health endpoint checks data access
      status: Actionable
      title: Backend Health
    diagram_nodes: []
    headline: Dashboard Truth vs Backend Health
    metric_callouts:
    - detail: Local paths, dashboard truth, complexity
      label: Failure map
      value: 3 modes
    subhead: Use a health endpoint that proves the service can reach its data.
    word_count: 53
- cue_marker: '[SLIDE: Action checklist: one node, persistent volume, bridge network,
    pinned image, health endpoint, failure test, commit]'
  duration_s: 35.0
  section_index: 4
  slide_id: slide_script_arc_conta_04
  slide_index: 4
  slide_type: key_takeaway
  spoken_anchor_text: Your next step is concrete. Build a one-node container lab today.
    Give it a persistent volume, a bridge network, a pinne...
  timestamp_end_s: 350.0
  timestamp_start_s: 315.0
  title: Build the One-Node Lab Today
  variant_a:
    badge_pills:
    - One-Node Lab
    - Failure Test
    - Commit Topology
    bullet_points:
    - Create a one-node lab with a persistent volume, a bridge network, and a pinned
      image so the topology is repeatable.
    - Add a health endpoint that checks data access, not just process startup, so
      recovery can be verified after restart.
    - 'Write a failure test: stop the node, restart it, confirm the service recovers,
      then commit the topology, labels, and configuration.'
    code_language: markdown
    code_snippet: '# one-node lab checklist

      - one node

      - persistent volume

      - bridge network

      - pinned image

      - health endpoint: /healthz

      - failure test: stop node, restart node

      - commit topology, labels, config'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: One node
      status: repeatable
      type: action
    - label: Persistent volume
      status: state preserved
      type: action
    - label: Bridge network
      status: defined reach
      type: action
    - label: Failure test
      status: stop/restart verified
      type: action
    headline: Build the One-Node Lab Today
    metric_callouts:
    - detail: Node, volume, network, image, health, failure test, commit
      label: Checklist
      value: 7 items
    subhead: 'Make the next step concrete: one node, persistent state, and a failure
      test.'
    word_count: 130
  variant_b:
    badge_pills:
    - One-Node Lab
    - Failure Test
    bullet_points:
    - Give the lab a persistent volume, bridge network, pinned image, and health endpoint.
    - Run a stop/restart failure test, then commit the topology and labels.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: One-Node Lab Action Plan
    metric_callouts:
    - detail: Small and repeatable
      label: Lab size
      value: 1 node
    - detail: Confirm service recovery
      label: Failure test
      value: Stop/restart
    subhead: Build it, test failure, and commit the result.
    word_count: 47
total_duration_s: 350.0
total_slides: 5
---

# Presentation Deck: Arc Containerlabs Implementat 9D112E Ep3

> [!abstract] Presentation Deck Overview
> - **Deck ID**: `deck_script_arc_containerlabs_impleme_3be4db` | **Script ID**: `[[scripts/script_arc_containerlabs_implementat_9d112e_ep3_d3f292|script_arc_containerlabs_implementat_9d112e_ep3_d3f292]]`
> - **Slide Count**: 5 slides | **Total Duration**: 05:50 (350.0s)
> - **Cue Coverage**: 100.0% | **Pacing Alignment**: 98.5%
>
> ### A/B Comparative Benchmarks
> - **Variant A (Terminal Dark)**: Words/Slide: **119.2** | Cognitive Load: **100.0/100**
> - **Variant B (Infographic Clean)**: Words/Slide: **50.2** | Cognitive Load: **100.0/100**

---

## Slide 1: Green Demo vs Broken Cluster `^slide_script_arc_conta_00`
- **Type**: `title_hook` | **Section**: 1 | **Time**: 00:00 - 00:30 (30.0s)
- **Cue Marker**: `[SLIDE: Title: Container Lab Failure, key text: Green demo, broken cluster, fix assumptions]`

> [!quote] Spoken Teleprompter Anchor
> "Your container lab looks green in the demo, then dies in the real cluster. Nodes lose network, volumes vanish, and the o..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Container Lab Failure: Green Demo, Broken Cluster`
> **Subhead**: The lab is not failing because of code; it is failing because the assumptions were never tested.
> ```text
> demo: dashboard green
> cluster: node0 network down
> volume: /var/lib/containerlab missing
> log: no owner, no recovery path
> ```
> - `Demo state can look green while the real cluster loses node network, volume state, and recovery ownership.`
> - `Nodes can drop network paths and volumes can vanish, leaving only an unwritten log line as the first clue.`
> - `Debugging shifts from application code to lab assumptions: host paths, network names, storage mounts, and restart behavior.`
> `[Container Labs]`
> `[Failure Modes]`
> `[Cluster Readiness]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Green Demo vs Broken Cluster
> **Subhead**: *Stop guessing; fix the lab assumptions now.*
>
> | Green Demo | Real Cluster |
> | :--- | :--- |
> | `Looks healthy` | `Broken` |
>
> - A green dashboard does not prove the lab survives node or storage failure.
> - Build the lab with explicit network, volume, and recovery checks before trusting it.
> **Failure clue**: `1 log line` ()

---

## Slide 2: Tutorial Lab vs Production Reality `^slide_script_arc_conta_01`
- **Type**: `comparison_split` | **Section**: 2 | **Time**: 00:30 - 01:40 (70.0s)
- **Cue Marker**: `[DIAGRAM: split-screen: tutorial lab vs production reality, labels: host, network, volume, scheduler, operator]`

> [!quote] Spoken Teleprompter Anchor
> "Most first container labs fail because they copy a tutorial and call it infrastructure. You spin up a few containers, po..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Why Tutorial Labs Break in Reality`
> **Subhead**: A copied tutorial is not infrastructure until it has a failure story, storage recovery path, and state owner.
> ```text
> tutorial: docker compose up
> production: node failure, volume loss, scheduler reschedule
> missing: failure story, recovery path, state owner
> ```
> - `Tutorial labs often spin up containers and point a browser at a dashboard, then assume the host and network are stable.`
> - `Production reality includes node failure, volume loss, scheduler rescheduling, and operator ownership of state.`
> - `Without a node failure story, storage recovery path, and clear owner, the lab breaks silently when the environment changes.`
> `[Tutorial Lab]`
> `[Production Reality]`
> `[State Ownership]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Tutorial Lab vs Production Reality
> **Subhead**: *The gap is not the container; it is the missing failure model.*
>
> | Tutorial Lab | Production Reality |
> | :--- | :--- |
> | `Assumes stability` | `Fails under change` |
>
> - Tutorial labs assume stable host, network, and storage.
> - Production reality requires failure handling, recovery, and ownership.
> **Missing model**: `Failure story` ()

---

## Slide 3: Four Layers of a Trusted Lab `^slide_script_arc_conta_02`
- **Type**: `code_breakdown` | **Section**: 3 | **Time**: 01:40 - 04:10 (150.0s)
- **Cue Marker**: `[CODE: lab topology snippet: node, volume, network, health endpoint, labels, restart policy]`

> [!quote] Spoken Teleprompter Anchor
> "Here is the mental model. A container lab is a small, repeatable system with four layers: compute, network, storage, and..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Build the Smallest Lab That Can Be Trusted`
> **Subhead**: Treat the lab as a small, repeatable system with compute, network, storage, and observability.
> ```yaml
> lab:
>   node:
>     image: pinned:1.0
>     restart: unless-stopped
>     labels:
>       env: lab
>       owner: platform
>   network:
>     type: bridge
>     name: lab-net
>   volume:
>     name: lab-state
>     mount: /data
>   health:
>     endpoint: /healthz
>     checks:
>       - data-access
> ```
> - `Compute defines the container runtime and the host resources it can use, so the lab does not depend on an untracked machine.`
> - `Network defines how containers reach each other, how they reach the outside world, and what happens when a path disappears.`
> - `Storage and observability make state recoverable and health checkable, so a restart can be verified instead of guessed.`
> `[Lab Topology]`
> `[Restart Policy]`
> `[Health Endpoint]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Four Layers of a Trusted Lab
> **Subhead**: *Keep the lab small enough to inspect and repeat.*
> - Pin the image, define the network, and persist the volume.
> - Use a health endpoint that checks data access, not just process uptime.
> **Trusted layers**: `4` ()
> **Recovery signal**: `/healthz` ()

---

## Slide 4: Dashboard Truth vs Backend Health `^slide_script_arc_conta_03`
- **Type**: `architecture_diagram` | **Section**: 4 | **Time**: 04:10 - 05:15 (65.0s)
- **Cue Marker**: `[DIAGRAM: failure mode map: laptop-only paths, dashboard truth, complexity before failure test]`

> [!quote] Spoken Teleprompter Anchor
> "Three pitfalls will catch you. First, you build a lab that only works on your laptop. The network names, host paths, and..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Failure Modes That Catch Experienced Practitioners`
> **Subhead**: Three pitfalls turn a working demo into a fragile lab.
> ```text
> pitfall 1: host path /Users/.../lab
> pitfall 2: dashboard green, backend down
> pitfall 3: add scheduler before node restart test
> ```
> - `Laptop-only paths hardcode local network names, host paths, and DNS entries, so the lab breaks when moved to another machine.`
> - `Treating the dashboard as the source of truth hides backend failure; a green UI can exist while the service is down.`
> - `Adding complexity before a failure test hides recovery gaps, because the lab has not proven it can survive a node stop or restart.`
> `[Failure Modes]`
> `[Portability]`
> `[Health Checks]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Dashboard Truth vs Backend Health
> **Subhead**: *Use a health endpoint that proves the service can reach its data.*
>
> | Dashboard Truth | Backend Health |
> | :--- | :--- |
> | `Misleading` | `Actionable` |
>
> - A dashboard can look green while the backend is down.
> - A health endpoint that checks data access gives a reliable failure signal.
> **Failure map**: `3 modes` ()

---

## Slide 5: One-Node Lab Action Plan `^slide_script_arc_conta_04`
- **Type**: `key_takeaway` | **Section**: 5 | **Time**: 05:15 - 05:50 (35.0s)
- **Cue Marker**: `[SLIDE: Action checklist: one node, persistent volume, bridge network, pinned image, health endpoint, failure test, commit]`

> [!quote] Spoken Teleprompter Anchor
> "Your next step is concrete. Build a one-node container lab today. Give it a persistent volume, a bridge network, a pinne..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Build the One-Node Lab Today`
> **Subhead**: Make the next step concrete: one node, persistent state, and a failure test.
> ```markdown
> # one-node lab checklist
> - one node
> - persistent volume
> - bridge network
> - pinned image
> - health endpoint: /healthz
> - failure test: stop node, restart node
> - commit topology, labels, config
> ```
> - `Create a one-node lab with a persistent volume, a bridge network, and a pinned image so the topology is repeatable.`
> - `Add a health endpoint that checks data access, not just process startup, so recovery can be verified after restart.`
> - `Write a failure test: stop the node, restart it, confirm the service recovers, then commit the topology, labels, and configuration.`
> `[One-Node Lab]`
> `[Failure Test]`
> `[Commit Topology]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: One-Node Lab Action Plan
> **Subhead**: *Build it, test failure, and commit the result.*
> - Give the lab a persistent volume, bridge network, pinned image, and health endpoint.
> - Run a stop/restart failure test, then commit the topology and labels.
> **Lab size**: `1 node` ()
> **Failure test**: `Stop/restart` ()

---