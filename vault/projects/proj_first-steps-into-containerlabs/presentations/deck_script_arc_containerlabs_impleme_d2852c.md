---
ai_metadata:
  domain: tech
  generator: ai_router
  model: qwen3.8-27b
  provider: openai_compatible
created_at: '2026-09-08T14:54:11.306382+00:00'
deck_id: deck_script_arc_containerlabs_impleme_d2852c
metrics:
  cue_coverage_percentage: 100.0
  pacing_alignment_score: 98.5
  variant_a_avg_words_per_slide: 106.2
  variant_a_cognitive_load_score: 100.0
  variant_b_avg_words_per_slide: 45.4
  variant_b_cognitive_load_score: 100.0
script_id: script_arc_containerlabs_implementat_9d112e_ep1_6821c1
script_title: Arc Containerlabs Implementat 9D112E Ep1
slides:
- cue_marker: '[SLIDE: A failed containerlab terminal with red error lines and the
    words: stale IP, lost bridge, config drift]'
  duration_s: 30.0
  section_index: 0
  slide_id: slide_script_arc_conta_00
  slide_index: 0
  slide_type: title_hook
  spoken_anchor_text: Your containerlab demo dies in front of the team because one
    node lost its bridge, a service still points at a stale IP,...
  timestamp_end_s: 30.0
  timestamp_start_s: 0.0
  title: The Lab That Breaks in Front of Everyone
  variant_a:
    badge_pills:
    - containerlab
    - network debugging
    - lab reliability
    bullet_points:
    - One node loses its bridge, so the running network no longer matches the intended
      topology.
    - A service still points at a stale IP, turning a simple link into a DNS or routing
      chase.
    - Multiple config files compete, and the team cannot tell which file actually
      won.
    code_language: text
    code_snippet: 'containerlab deploy -t lab.yaml

      ERROR: node r1: bridge br0 not found

      ERROR: service web: connect to 10.20.0.5:8080 refused

      WARN: config drift: topology.yaml vs service.yaml'
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: The Lab That Breaks in Front of Everyone
    metric_callouts: []
    subhead: A public demo fails when topology, service state, and config drift collide.
    word_count: 95
  variant_b:
    badge_pills:
    - Hook
    bullet_points:
    - Identify the failed node, stale IP, and winning config before adding complexity.
    - Rebuild the smallest topology that proves the lab can boot.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Stop Guessing. Fix the Lab.
    metric_callouts:
    - detail: Lost bridge, stale IP, config drift
      label: Failure surface
      value: '3'
    - detail: Chasing a topology that should boot in minutes
      label: Debug time
      value: 60 min
    - detail: A repeatable lab with clear state
      label: Target
      value: Minutes
    subhead: Turn a broken demo into a repeatable starting point.
    word_count: 46
- cue_marker: '[DIAGRAM: Split-screen comparison: messy single-file lab versus layered
    lab with topology, service, and environment files]'
  duration_s: 65.0
  section_index: 1
  slide_id: slide_script_arc_conta_01
  slide_index: 1
  slide_type: comparison_split
  spoken_anchor_text: Most first containerlabs fail because people copy a diagram
    and call it architecture. You draw nodes, links, and service...
  timestamp_end_s: 95.0
  timestamp_start_s: 30.0
  title: Why First Containerlabs Become Debugging Mazes
  variant_a:
    badge_pills:
    - topology
    - runtime state
    - single-file risk
    bullet_points:
    - People draw nodes, links, and services, then assume the runtime will behave
      exactly like the picture.
    - Tiny networks still require DNS resolution, bridge creation, service restarts,
      and state cleanup.
    - A single-file lab hides the boundary between topology, service behavior, and
      environment assumptions.
    code_language: text
    code_snippet: "lab.yaml:\ntopology:\n  nodes:\n    r1:\n      kind: linux\n    r2:\n
      \     kind: linux\n  links:\n    - endpoints: ['r1:eth0', 'r2:eth0']\nservices:\n
      \ web:\n    image: nginx\n    env:\n      TARGET: 10.20.0.5"
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Why First Containerlabs Become Debugging Mazes
    metric_callouts: []
    subhead: A copied diagram is not architecture; the runtime still has DNS, bridges,
      restarts, and stale state.
    word_count: 90
  variant_b:
    badge_pills:
    - Problem Breakdown
    bullet_points:
    - A single file mixes topology, services, and environment, making failures hard
      to isolate.
    - Layered files let you test the network, the service, and the config independently.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Topology, service, and environment collide in one file.
      status: Hard to debug
      title: Messy Single-File Lab
    comparison_right:
      color: emerald
      note: Topology, service, and environment are separated.
      status: Easier to reason
      title: Layered Lab
    diagram_nodes: []
    headline: Messy Single File vs Layered Lab
    metric_callouts: []
    subhead: Separate what the lab is from what it runs.
    word_count: 54
- cue_marker: '[CODE: Minimal lab structure: topology.yaml, service.yaml, env.yaml,
    plus one health check command and one teardown command]'
  duration_s: 152.0
  section_index: 2
  slide_id: slide_script_arc_conta_02
  slide_index: 2
  slide_type: code_breakdown
  spoken_anchor_text: Start with the smallest topology that proves your idea. For
    a first containerlab, use two or three nodes, one link betwe...
  timestamp_end_s: 247.0
  timestamp_start_s: 95.0
  title: Build a Repeatable Containerlab From Three Layers
  variant_a:
    badge_pills:
    - minimal topology
    - layered config
    - health check
    bullet_points:
    - Use a minimal topology with two or three nodes and one link, enough to test
      networking without noise.
    - Keep topology.yaml, service.yaml, and env.yaml separate so each layer can be
      rebuilt and inspected.
    - Add one health check and one teardown command so success and cleanup are explicit,
      not assumed.
    code_language: text
    code_snippet: "topology.yaml:\n  nodes:\n    node-a:\n      kind: linux\n    node-b:\n
      \     kind: linux\n  links:\n    - endpoints: ['node-a:eth0', 'node-b:eth0']\n\nservice.yaml:\n
      \ services:\n    app:\n      image: alpine\n      command: ['sh', '-c', 'while
      true; do echo ok; sleep 1; done']\n\nenv.yaml:\n  APP_ENV: dev\n  HEALTH_PORT:
      8080\n\nhealth:\n  containerlab exec node-a -- curl -fsS http://localhost:8080/health\nteardown:\n
      \ containerlab destroy -t topology.yaml"
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Build a Repeatable Containerlab From Three Layers
    metric_callouts: []
    subhead: 'Start with the smallest topology that proves the idea: two or three
      nodes, one link, one service per node.'
    word_count: 127
  variant_b:
    badge_pills:
    - Deep Dive
    bullet_points:
    - Separate topology, service, and environment into three files.
    - Prove the lab with one health check and one teardown command.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Three Files, One Proof
    metric_callouts:
    - detail: Small enough to debug quickly
      label: Nodes
      value: 2-3
    - detail: One link proves basic networking
      label: Links
      value: '1'
    - detail: topology, service, environment
      label: Files
      value: '3'
    subhead: A small lab is easier to trust than a large one.
    word_count: 42
- cue_marker: '[DIAGRAM: Three failure paths: overbuilt topology, silent dependency,
    and config drift with old and new values colliding]'
  duration_s: 59.0
  section_index: 3
  slide_id: slide_script_arc_conta_03
  slide_index: 3
  slide_type: architecture_diagram
  spoken_anchor_text: Watch for three traps. First, overbuilding. You add five nodes,
    a load balancer, and a monitoring stack before the basic...
  timestamp_end_s: 306.0
  timestamp_start_s: 247.0
  title: Three Failure Modes That Catch Experienced Practitioners
  variant_a:
    badge_pills:
    - failure modes
    - dependency checks
    - config drift
    bullet_points:
    - Overbuilding adds nodes, load balancers, and monitoring before the basic link
      works, hiding the first failure.
    - Silent dependencies assume DNS, ports, or files exist, but the lab never verifies
      them before startup.
    - Config drift lets old and new values collide, so the running service may not
      match the intended file.
    code_language: text
    code_snippet: "failure checks:\n  - node count > 3 before the basic link works\n
      \ - service assumes DNS: app.internal\n  - service assumes port: 8080\n  - env.yaml:
      TARGET=10.20.0.5\n  - service.yaml: TARGET=10.20.0.6"
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Overbuilt topology
      status: Too many moving parts
      type: failure path
    - label: Silent dependency
      status: Unverified DNS, port, or file
      type: failure path
    - label: Config drift
      status: Old and new values collide
      type: failure path
    headline: Three Failure Modes That Catch Experienced Practitioners
    metric_callouts: []
    subhead: Complexity, unverified assumptions, and stale values turn a lab into
      a debugging maze.
    word_count: 116
  variant_b:
    badge_pills:
    - Pitfalls
    bullet_points:
    - Do not add nodes until the first link and service are proven.
    - Verify DNS, ports, and files before treating the lab as healthy.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Three Traps, One Guard
    metric_callouts:
    - detail: Add complexity before the basic link works
      label: Overbuilding
      value: Trap
    - detail: Assume DNS, port, or file exists
      label: Silent dependency
      value: Trap
    - detail: Old and new values collide
      label: Config drift
      value: Trap
    subhead: Keep the lab small and verify what it assumes.
    word_count: 45
- cue_marker: '[SLIDE: Checklist: 2 nodes, 1 link, 1 service, 1 health check, 1 teardown,
    separate files, rebuild command]'
  duration_s: 31.0
  section_index: 4
  slide_id: slide_script_arc_conta_04
  slide_index: 4
  slide_type: key_takeaway
  spoken_anchor_text: Build one small containerlab today. Two nodes, one link, one
    service, one health check, and one teardown command. Name e...
  timestamp_end_s: 337.0
  timestamp_start_s: 306.0
  title: Your First Repeatable Lab
  variant_a:
    badge_pills:
    - repeatable lab
    - checklist
    - first failure
    bullet_points:
    - Use two nodes, one link, one service, one health check, and one teardown command.
    - Name every object and keep topology, service, and environment in separate files.
    - Run the lab until it fails, then fix the first provable failure before adding
      another node.
    code_language: text
    code_snippet: "checklist:\n  - 2 nodes\n  - 1 link\n  - 1 service\n  - 1 health
      check\n  - 1 teardown\n  - separate files\n  - rebuild command\n\nrebuild:\n
      \ containerlab destroy -t topology.yaml\n  containerlab deploy -t topology.yaml\n
      \ containerlab exec node-a -- curl -fsS http://localhost:8080/health"
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Your First Repeatable Lab
    metric_callouts: []
    subhead: Build one small containerlab today and fix the first failure you can
      prove.
    word_count: 103
  variant_b:
    badge_pills:
    - Action Call
    bullet_points:
    - Start with 2 nodes, 1 link, and 1 service.
    - Add complexity only after the first failure is fixed.
    code_language: null
    code_snippet: null
    comparison_left:
      color: amber
      note: Adding nodes before the first link works.
      status: Unproven
      title: Before
    comparison_right:
      color: emerald
      note: One small lab with health check and teardown.
      status: Repeatable
      title: After
    diagram_nodes: []
    headline: Small First, Proven Next
    metric_callouts: []
    subhead: A repeatable lab is built by proving one layer at a time.
    word_count: 40
total_duration_s: 337.0
total_slides: 5
---

# Presentation Deck: Arc Containerlabs Implementat 9D112E Ep1

> [!abstract] Presentation Deck Overview
> - **Deck ID**: `deck_script_arc_containerlabs_impleme_d2852c` | **Script ID**: `[[scripts/script_arc_containerlabs_implementat_9d112e_ep1_6821c1|script_arc_containerlabs_implementat_9d112e_ep1_6821c1]]`
> - **Slide Count**: 5 slides | **Total Duration**: 05:37 (337.0s)
> - **Cue Coverage**: 100.0% | **Pacing Alignment**: 98.5%
>
> ### A/B Comparative Benchmarks
> - **Variant A (Terminal Dark)**: Words/Slide: **106.2** | Cognitive Load: **100.0/100**
> - **Variant B (Infographic Clean)**: Words/Slide: **45.4** | Cognitive Load: **100.0/100**

---

## Slide 1: Stop Guessing. Fix the Lab. `^slide_script_arc_conta_00`
- **Type**: `title_hook` | **Section**: 1 | **Time**: 00:00 - 00:30 (30.0s)
- **Cue Marker**: `[SLIDE: A failed containerlab terminal with red error lines and the words: stale IP, lost bridge, config drift]`

> [!quote] Spoken Teleprompter Anchor
> "Your containerlab demo dies in front of the team because one node lost its bridge, a service still points at a stale IP,..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `The Lab That Breaks in Front of Everyone`
> **Subhead**: A public demo fails when topology, service state, and config drift collide.
> ```text
> containerlab deploy -t lab.yaml
> ERROR: node r1: bridge br0 not found
> ERROR: service web: connect to 10.20.0.5:8080 refused
> WARN: config drift: topology.yaml vs service.yaml
> ```
> - `One node loses its bridge, so the running network no longer matches the intended topology.`
> - `A service still points at a stale IP, turning a simple link into a DNS or routing chase.`
> - `Multiple config files compete, and the team cannot tell which file actually won.`
> `[containerlab]`
> `[network debugging]`
> `[lab reliability]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Stop Guessing. Fix the Lab.
> **Subhead**: *Turn a broken demo into a repeatable starting point.*
> - Identify the failed node, stale IP, and winning config before adding complexity.
> - Rebuild the smallest topology that proves the lab can boot.
> **Failure surface**: `3` ()
> **Debug time**: `60 min` ()
> **Target**: `Minutes` ()

---

## Slide 2: Messy Single File vs Layered Lab `^slide_script_arc_conta_01`
- **Type**: `comparison_split` | **Section**: 2 | **Time**: 00:30 - 01:35 (65.0s)
- **Cue Marker**: `[DIAGRAM: Split-screen comparison: messy single-file lab versus layered lab with topology, service, and environment files]`

> [!quote] Spoken Teleprompter Anchor
> "Most first containerlabs fail because people copy a diagram and call it architecture. You draw nodes, links, and service..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Why First Containerlabs Become Debugging Mazes`
> **Subhead**: A copied diagram is not architecture; the runtime still has DNS, bridges, restarts, and stale state.
> ```text
> lab.yaml:
> topology:
>   nodes:
>     r1:
>       kind: linux
>     r2:
>       kind: linux
>   links:
>     - endpoints: ['r1:eth0', 'r2:eth0']
> services:
>   web:
>     image: nginx
>     env:
>       TARGET: 10.20.0.5
> ```
> - `People draw nodes, links, and services, then assume the runtime will behave exactly like the picture.`
> - `Tiny networks still require DNS resolution, bridge creation, service restarts, and state cleanup.`
> - `A single-file lab hides the boundary between topology, service behavior, and environment assumptions.`
> `[topology]`
> `[runtime state]`
> `[single-file risk]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Messy Single File vs Layered Lab
> **Subhead**: *Separate what the lab is from what it runs.*
>
> | Messy Single-File Lab | Layered Lab |
> | :--- | :--- |
> | `Hard to debug` | `Easier to reason` |
>
> - A single file mixes topology, services, and environment, making failures hard to isolate.
> - Layered files let you test the network, the service, and the config independently.

---

## Slide 3: Three Files, One Proof `^slide_script_arc_conta_02`
- **Type**: `code_breakdown` | **Section**: 3 | **Time**: 01:35 - 04:07 (152.0s)
- **Cue Marker**: `[CODE: Minimal lab structure: topology.yaml, service.yaml, env.yaml, plus one health check command and one teardown command]`

> [!quote] Spoken Teleprompter Anchor
> "Start with the smallest topology that proves your idea. For a first containerlab, use two or three nodes, one link betwe..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Build a Repeatable Containerlab From Three Layers`
> **Subhead**: Start with the smallest topology that proves the idea: two or three nodes, one link, one service per node.
> ```text
> topology.yaml:
>   nodes:
>     node-a:
>       kind: linux
>     node-b:
>       kind: linux
>   links:
>     - endpoints: ['node-a:eth0', 'node-b:eth0']
> 
> service.yaml:
>   services:
>     app:
>       image: alpine
>       command: ['sh', '-c', 'while true; do echo ok; sleep 1; done']
> 
> env.yaml:
>   APP_ENV: dev
>   HEALTH_PORT: 8080
> 
> health:
>   containerlab exec node-a -- curl -fsS http://localhost:8080/health
> teardown:
>   containerlab destroy -t topology.yaml
> ```
> - `Use a minimal topology with two or three nodes and one link, enough to test networking without noise.`
> - `Keep topology.yaml, service.yaml, and env.yaml separate so each layer can be rebuilt and inspected.`
> - `Add one health check and one teardown command so success and cleanup are explicit, not assumed.`
> `[minimal topology]`
> `[layered config]`
> `[health check]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Three Files, One Proof
> **Subhead**: *A small lab is easier to trust than a large one.*
> - Separate topology, service, and environment into three files.
> - Prove the lab with one health check and one teardown command.
> **Nodes**: `2-3` ()
> **Links**: `1` ()
> **Files**: `3` ()

---

## Slide 4: Three Traps, One Guard `^slide_script_arc_conta_03`
- **Type**: `architecture_diagram` | **Section**: 4 | **Time**: 04:07 - 05:06 (59.0s)
- **Cue Marker**: `[DIAGRAM: Three failure paths: overbuilt topology, silent dependency, and config drift with old and new values colliding]`

> [!quote] Spoken Teleprompter Anchor
> "Watch for three traps. First, overbuilding. You add five nodes, a load balancer, and a monitoring stack before the basic..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Three Failure Modes That Catch Experienced Practitioners`
> **Subhead**: Complexity, unverified assumptions, and stale values turn a lab into a debugging maze.
> ```text
> failure checks:
>   - node count > 3 before the basic link works
>   - service assumes DNS: app.internal
>   - service assumes port: 8080
>   - env.yaml: TARGET=10.20.0.5
>   - service.yaml: TARGET=10.20.0.6
> ```
> - `Overbuilding adds nodes, load balancers, and monitoring before the basic link works, hiding the first failure.`
> - `Silent dependencies assume DNS, ports, or files exist, but the lab never verifies them before startup.`
> - `Config drift lets old and new values collide, so the running service may not match the intended file.`
> `[failure modes]`
> `[dependency checks]`
> `[config drift]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Three Traps, One Guard
> **Subhead**: *Keep the lab small and verify what it assumes.*
> - Do not add nodes until the first link and service are proven.
> - Verify DNS, ports, and files before treating the lab as healthy.
> **Overbuilding**: `Trap` ()
> **Silent dependency**: `Trap` ()
> **Config drift**: `Trap` ()

---

## Slide 5: Small First, Proven Next `^slide_script_arc_conta_04`
- **Type**: `key_takeaway` | **Section**: 5 | **Time**: 05:06 - 05:37 (31.0s)
- **Cue Marker**: `[SLIDE: Checklist: 2 nodes, 1 link, 1 service, 1 health check, 1 teardown, separate files, rebuild command]`

> [!quote] Spoken Teleprompter Anchor
> "Build one small containerlab today. Two nodes, one link, one service, one health check, and one teardown command. Name e..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Your First Repeatable Lab`
> **Subhead**: Build one small containerlab today and fix the first failure you can prove.
> ```text
> checklist:
>   - 2 nodes
>   - 1 link
>   - 1 service
>   - 1 health check
>   - 1 teardown
>   - separate files
>   - rebuild command
> 
> rebuild:
>   containerlab destroy -t topology.yaml
>   containerlab deploy -t topology.yaml
>   containerlab exec node-a -- curl -fsS http://localhost:8080/health
> ```
> - `Use two nodes, one link, one service, one health check, and one teardown command.`
> - `Name every object and keep topology, service, and environment in separate files.`
> - `Run the lab until it fails, then fix the first provable failure before adding another node.`
> `[repeatable lab]`
> `[checklist]`
> `[first failure]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Small First, Proven Next
> **Subhead**: *A repeatable lab is built by proving one layer at a time.*
>
> | Before | After |
> | :--- | :--- |
> | `Unproven` | `Repeatable` |
>
> - Start with 2 nodes, 1 link, and 1 service.
> - Add complexity only after the first failure is fixed.

---