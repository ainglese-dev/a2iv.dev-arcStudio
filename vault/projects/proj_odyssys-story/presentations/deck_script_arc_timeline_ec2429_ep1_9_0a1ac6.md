---
ai_metadata:
  domain: narrative_cinema
  generator: ai_router
  model: qwen3.8-27b
  provider: openai_compatible
created_at: '2026-09-08T00:35:59.704839+00:00'
deck_id: deck_script_arc_timeline_ec2429_ep1_9_0a1ac6
metrics:
  cue_coverage_percentage: 100.0
  pacing_alignment_score: 98.5
  variant_a_avg_words_per_slide: 118.6
  variant_a_cognitive_load_score: 100.0
  variant_b_avg_words_per_slide: 40.2
  variant_b_cognitive_load_score: 100.0
script_id: script_arc_timeline_ec2429_ep1_9443bb
script_title: 'Arc Timeline Ec2429 Ep1: Nolan, History, and the Accuracy Build'
slides:
- cue_marker: '[SLIDE: 11 PM source spreadsheet with red flags on ship, temple, battle,
    and date rows]'
  duration_s: 30.0
  section_index: 0
  slide_id: slide_script_arc_timel_00
  slide_index: 0
  slide_type: title_hook
  spoken_anchor_text: 'You''re at 11 PM, laptop fans screaming, staring at a 400-row
    source sheet. Every row is a claim: a ship, a temple, a bat...'
  timestamp_end_s: 30.0
  timestamp_start_s: 0.0
  title: The 11 PM Accuracy Failure
  variant_a:
    badge_pills:
    - Historical Accuracy
    - Production Risk
    - Nolan Effect
    bullet_points:
    - 'Every row is a cinematic claim: ship silhouette, temple ritual, battle route,
      or date that can break the audience''s trust.'
    - 'Nolan''s recent comments raise the stakes: historical accuracy is now a visible
      quality bar, not a back-office detail.'
    - At 11 PM, the production timeline is bleeding; one wrong era or fake ritual
      can force a reshoot, regrade, or rewrite.
    code_language: screenplay
    code_snippet: 'INT. EDITING BAY - NIGHT


      A 400-row source sheet glows on the monitor. Red flags mark ship, temple, battle,
      and date rows.


      PRODUCER

      If we ship this, the audience will see the crack.'
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: The 11 PM Accuracy Failure
    metric_callouts: []
    subhead: A 400-row source sheet turns historical claims into production risk.
    word_count: 113
  variant_b:
    badge_pills:
    - Hook
    bullet_points:
    - 400 source rows compress into four visible claim types.
    - A single wrong era can stop the cut.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: One Spreadsheet, Four Red Flags
    metric_callouts:
    - detail: Claims to verify before the next cut
      label: Source Rows
      value: '400'
    - detail: Ship, temple, battle, date
      label: Red Flag Types
      value: '4'
    - detail: Production timeline is bleeding
      label: Deadline Pressure
      value: 11 PM
    subhead: 'The hook: accuracy becomes a deadline problem.'
    word_count: 41
- cue_marker: '[DIAGRAM: broken legacy documentation pipeline from script note to
    conflicting sources to blind production push]'
  duration_s: 72.0
  section_index: 1
  slide_id: slide_script_arc_timel_01
  slide_index: 1
  slide_type: architecture_diagram
  spoken_anchor_text: Here is why historical accuracy breaks in messy production.
    The legacy documentation is a lie. A script note says Trojan...
  timestamp_end_s: 102.0
  timestamp_start_s: 30.0
  title: Why Historical Accuracy Breaks in Production
  variant_a:
    badge_pills:
    - Legacy Documentation
    - Source Conflict
    - Scene Build
    bullet_points:
    - A script note saying Trojan War era bundles pottery, trade routes, ship types,
      and ritual practice into a single ambiguous label.
    - The source spreadsheet looks complete, but it is a pile of conflicting claims
      with no clear winner for the scene.
    - 'When the schedule pushes, production moves on blind: the scene gets built before
      the evidence is reconciled.'
    code_language: markdown
    code_snippet: 'SCRIPT NOTE: Trojan War era

      HIDDEN LAYERS: pottery styles, trade routes, ship types, ritual practice

      SOURCE SHEET: 400 rows, conflicting dates, no scene-level verdict'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Script Note
      status: Trojan War era
      type: ambiguous claim
    - label: Conflicting Sources
      status: dates and artifacts disagree
      type: evidence pile
    - label: Blind Production Push
      status: scene built before validation
      type: schedule pressure
    headline: Why Historical Accuracy Breaks in Production
    metric_callouts: []
    subhead: Legacy documentation hides centuries of material culture behind one phrase.
    word_count: 117
  variant_b:
    badge_pills:
    - Problem Breakdown
    bullet_points:
    - One phrase hides multiple historical layers.
    - Production proceeds before the layers are checked.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: A single phrase with no scene-level evidence
      status: Trojan War era
      title: Legacy Note
    comparison_right:
      color: amber
      note: Schedule forces a build before sources agree
      status: Blind push
      title: Production Reality
    diagram_nodes: []
    headline: From Vague Note to Broken Scene
    metric_callouts: []
    subhead: The problem is not missing history; it is unresolved history.
    word_count: 40
- cue_marker: '[DIAGRAM: four-layer accuracy architecture: source ingestion, evidence
    graph, timeline validation, error budget]'
  duration_s: 170.0
  section_index: 2
  slide_id: slide_script_arc_timel_02
  slide_index: 2
  slide_type: architecture_diagram
  spoken_anchor_text: Let's look at the architecture. Think of historical accuracy
    as a distributed system. The primary sources are your telem...
  timestamp_end_s: 272.0
  timestamp_start_s: 102.0
  title: The Four-Layer Accuracy Architecture
  variant_a:
    badge_pills:
    - Evidence Graph
    - Timeline Validation
    - Error Budget
    bullet_points:
    - Source ingestion treats inscriptions, pottery, ship remains, comparative linguistics,
      and archaeological reports as telemetry for the story.
    - The evidence graph links claims to artifacts, dates, and routes so a scene can
      show why a ship, temple, or ritual belongs in the frame.
    - Timeline validation and error budget decide what can be shown as fact, what
      can be marked as liberty, and what must be cut or softened.
    code_language: markdown
    code_snippet: 'source_ingestion -> evidence_graph -> timeline_validation -> error_budget


      primary_sources: inscriptions, pottery, ship remains, linguistics, archaeology

      script: build artifact

      audience: production environment'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Source Ingestion
      status: primary sources enter
      type: telemetry
    - label: Evidence Graph
      status: links artifacts to scenes
      type: claim network
    - label: Timeline Validation
      status: dates and routes tested
      type: chronology check
    - label: Error Budget
      status: liberties marked or cut
      type: risk control
    headline: The Four-Layer Accuracy Architecture
    metric_callouts: []
    subhead: 'Treat historical accuracy like a distributed system: ingest, graph,
      validate, budget.'
    word_count: 123
  variant_b:
    badge_pills:
    - Deep Dive
    bullet_points:
    - Ingest sources, then connect them into an evidence graph.
    - Validate the timeline and set a clear error budget.
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Accuracy as a Four-Step Build
    metric_callouts:
    - detail: Ingestion, graph, validation, budget
      label: Layers
      value: '4'
    - detail: Inscriptions, pottery, ships, linguistics, archaeology
      label: Source Types
      value: '5'
    - detail: The final environment that tests the story
      label: Audience Role
      value: Production
    subhead: A clean pipeline from raw history to a defensible scene.
    word_count: 43
- cue_marker: '[SLIDE: four failure modes: decoration, source tunneling, hidden bending,
    overfitting]'
  duration_s: 60.0
  section_index: 3
  slide_id: slide_script_arc_timel_03
  slide_index: 3
  slide_type: comparison_split
  spoken_anchor_text: The biggest pitfall is treating accuracy as decoration. You
    add a historical consultant, take a few notes, and then the...
  timestamp_end_s: 332.0
  timestamp_start_s: 272.0
  title: Four Failure Modes That Kill Trust
  variant_a:
    badge_pills:
    - Trust Risk
    - Source Bias
    - Scene Integrity
    bullet_points:
    - 'Decoration: a consultant is added, notes are taken, and the schedule eats the
      evidence before the scene is locked.'
    - 'Source tunneling: one dramatic paper becomes the whole truth while boring but
      stronger evidence is ignored.'
    - 'Hidden bending and overfitting: the story quietly shifts dates, routes, or
      rituals, then the scene is tuned to one fragile claim.'
    code_language: markdown
    code_snippet: 'FAILURE MODES

      1. Decoration: evidence after the cut

      2. Source tunneling: one paper, whole truth

      3. Hidden bending: dates and routes shift quietly

      4. Overfitting: scene tuned to a fragile claim'
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Four Failure Modes That Kill Trust
    metric_callouts: []
    subhead: Accuracy fails when it is treated as decoration, not as scene logic.
    word_count: 111
  variant_b:
    badge_pills:
    - Pitfalls
    bullet_points:
    - Decoration adds history as surface detail.
    - Validation makes history part of the scene's logic.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Consultant notes get buried by schedule
      status: Evidence after cut
      title: Decoration Mode
    comparison_right:
      color: emerald
      note: Claims are checked against route, props, ritual, date
      status: Evidence before cut
      title: Validation Mode
    diagram_nodes: []
    headline: Decoration vs. Validation
    metric_callouts: []
    subhead: The split that decides whether the audience believes the world.
    word_count: 38
- cue_marker: '[CODE: accuracy_sheet.yaml with core_events, liberties, adjacent_claims,
    and validation_checks]'
  duration_s: 34.0
  section_index: 4
  slide_id: slide_script_arc_timel_04
  slide_index: 4
  slide_type: code_breakdown
  spoken_anchor_text: Here is your move. Build a small accuracy sheet before the next
    cut. Put the core events in the close zone, mark every l...
  timestamp_end_s: 366.0
  timestamp_start_s: 332.0
  title: Build the Accuracy Sheet Before the Next Cut
  variant_a:
    badge_pills:
    - Accuracy Sheet
    - Scene Test
    - Liberty Control
    bullet_points:
    - 'Put core events in the close zone: the facts the scene depends on, such as
      route, props, ritual, and date.'
    - Mark every liberty explicitly, so the audience can separate invented detail
      from defended history.
    - 'Flag adjacent claims that need one more source, then run the scene like a test:
      if it fails, fix the scene or lower the claim.'
    code_language: yaml
    code_snippet: "accuracy_sheet.yaml:\n  core_events:\n    - route: Trojan coast
      approach\n    - props: ship type and cargo\n    - ritual: temple offering\n
      \   - date: season and campaign window\n  liberties:\n    - character dialogue\n
      \   - dramatic weather\n  adjacent_claims:\n    - trade route variant\n  validation_checks:\n
      \   - source match\n    - timeline consistency\n    - artifact compatibility"
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Build the Accuracy Sheet Before the Next Cut
    metric_callouts: []
    subhead: A small YAML sheet turns historical claims into testable scene checks.
    word_count: 129
  variant_b:
    badge_pills:
    - Action Call
    bullet_points:
    - Lock core events, mark liberties, flag adjacent claims.
    - 'Run the scene as a test: route, props, ritual, date.'
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: One Sheet, Three Zones
    metric_callouts:
    - detail: Route, props, ritual, date
      label: Core Zone
      value: '4'
    - detail: Invented details are visible
      label: Liberties
      value: Marked
    - detail: Need one more source
      label: Adjacent Claims
      value: Flagged
    subhead: A practical move before the next cut.
    word_count: 39
total_duration_s: 366.0
total_slides: 5
---

# Presentation Deck: Arc Timeline Ec2429 Ep1: Nolan, History, and the Accuracy Build

> [!abstract] Presentation Deck Overview
> - **Deck ID**: `deck_script_arc_timeline_ec2429_ep1_9_0a1ac6` | **Script ID**: `[[scripts/script_arc_timeline_ec2429_ep1_9443bb|script_arc_timeline_ec2429_ep1_9443bb]]`
> - **Slide Count**: 5 slides | **Total Duration**: 06:06 (366.0s)
> - **Cue Coverage**: 100.0% | **Pacing Alignment**: 98.5%
>
> ### A/B Comparative Benchmarks
> - **Variant A (Terminal Dark)**: Words/Slide: **118.6** | Cognitive Load: **100.0/100**
> - **Variant B (Infographic Clean)**: Words/Slide: **40.2** | Cognitive Load: **100.0/100**

---

## Slide 1: One Spreadsheet, Four Red Flags `^slide_script_arc_timel_00`
- **Type**: `title_hook` | **Section**: 1 | **Time**: 00:00 - 00:30 (30.0s)
- **Cue Marker**: `[SLIDE: 11 PM source spreadsheet with red flags on ship, temple, battle, and date rows]`

> [!quote] Spoken Teleprompter Anchor
> "You're at 11 PM, laptop fans screaming, staring at a 400-row source sheet. Every row is a claim: a ship, a temple, a bat..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `The 11 PM Accuracy Failure`
> **Subhead**: A 400-row source sheet turns historical claims into production risk.
> ```screenplay
> INT. EDITING BAY - NIGHT
> 
> A 400-row source sheet glows on the monitor. Red flags mark ship, temple, battle, and date rows.
> 
> PRODUCER
> If we ship this, the audience will see the crack.
> ```
> - `Every row is a cinematic claim: ship silhouette, temple ritual, battle route, or date that can break the audience's trust.`
> - `Nolan's recent comments raise the stakes: historical accuracy is now a visible quality bar, not a back-office detail.`
> - `At 11 PM, the production timeline is bleeding; one wrong era or fake ritual can force a reshoot, regrade, or rewrite.`
> `[Historical Accuracy]`
> `[Production Risk]`
> `[Nolan Effect]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: One Spreadsheet, Four Red Flags
> **Subhead**: *The hook: accuracy becomes a deadline problem.*
> - 400 source rows compress into four visible claim types.
> - A single wrong era can stop the cut.
> **Source Rows**: `400` ()
> **Red Flag Types**: `4` ()
> **Deadline Pressure**: `11 PM` ()

---

## Slide 2: From Vague Note to Broken Scene `^slide_script_arc_timel_01`
- **Type**: `architecture_diagram` | **Section**: 2 | **Time**: 00:30 - 01:42 (72.0s)
- **Cue Marker**: `[DIAGRAM: broken legacy documentation pipeline from script note to conflicting sources to blind production push]`

> [!quote] Spoken Teleprompter Anchor
> "Here is why historical accuracy breaks in messy production. The legacy documentation is a lie. A script note says Trojan..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Why Historical Accuracy Breaks in Production`
> **Subhead**: Legacy documentation hides centuries of material culture behind one phrase.
> ```markdown
> SCRIPT NOTE: Trojan War era
> HIDDEN LAYERS: pottery styles, trade routes, ship types, ritual practice
> SOURCE SHEET: 400 rows, conflicting dates, no scene-level verdict
> ```
> - `A script note saying Trojan War era bundles pottery, trade routes, ship types, and ritual practice into a single ambiguous label.`
> - `The source spreadsheet looks complete, but it is a pile of conflicting claims with no clear winner for the scene.`
> - `When the schedule pushes, production moves on blind: the scene gets built before the evidence is reconciled.`
> `[Legacy Documentation]`
> `[Source Conflict]`
> `[Scene Build]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: From Vague Note to Broken Scene
> **Subhead**: *The problem is not missing history; it is unresolved history.*
>
> | Legacy Note | Production Reality |
> | :--- | :--- |
> | `Trojan War era` | `Blind push` |
>
> - One phrase hides multiple historical layers.
> - Production proceeds before the layers are checked.

---

## Slide 3: Accuracy as a Four-Step Build `^slide_script_arc_timel_02`
- **Type**: `architecture_diagram` | **Section**: 3 | **Time**: 01:42 - 04:32 (170.0s)
- **Cue Marker**: `[DIAGRAM: four-layer accuracy architecture: source ingestion, evidence graph, timeline validation, error budget]`

> [!quote] Spoken Teleprompter Anchor
> "Let's look at the architecture. Think of historical accuracy as a distributed system. The primary sources are your telem..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `The Four-Layer Accuracy Architecture`
> **Subhead**: Treat historical accuracy like a distributed system: ingest, graph, validate, budget.
> ```markdown
> source_ingestion -> evidence_graph -> timeline_validation -> error_budget
> 
> primary_sources: inscriptions, pottery, ship remains, linguistics, archaeology
> script: build artifact
> audience: production environment
> ```
> - `Source ingestion treats inscriptions, pottery, ship remains, comparative linguistics, and archaeological reports as telemetry for the story.`
> - `The evidence graph links claims to artifacts, dates, and routes so a scene can show why a ship, temple, or ritual belongs in the frame.`
> - `Timeline validation and error budget decide what can be shown as fact, what can be marked as liberty, and what must be cut or softened.`
> `[Evidence Graph]`
> `[Timeline Validation]`
> `[Error Budget]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Accuracy as a Four-Step Build
> **Subhead**: *A clean pipeline from raw history to a defensible scene.*
> - Ingest sources, then connect them into an evidence graph.
> - Validate the timeline and set a clear error budget.
> **Layers**: `4` ()
> **Source Types**: `5` ()
> **Audience Role**: `Production` ()

---

## Slide 4: Decoration vs. Validation `^slide_script_arc_timel_03`
- **Type**: `comparison_split` | **Section**: 4 | **Time**: 04:32 - 05:32 (60.0s)
- **Cue Marker**: `[SLIDE: four failure modes: decoration, source tunneling, hidden bending, overfitting]`

> [!quote] Spoken Teleprompter Anchor
> "The biggest pitfall is treating accuracy as decoration. You add a historical consultant, take a few notes, and then the..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Four Failure Modes That Kill Trust`
> **Subhead**: Accuracy fails when it is treated as decoration, not as scene logic.
> ```markdown
> FAILURE MODES
> 1. Decoration: evidence after the cut
> 2. Source tunneling: one paper, whole truth
> 3. Hidden bending: dates and routes shift quietly
> 4. Overfitting: scene tuned to a fragile claim
> ```
> - `Decoration: a consultant is added, notes are taken, and the schedule eats the evidence before the scene is locked.`
> - `Source tunneling: one dramatic paper becomes the whole truth while boring but stronger evidence is ignored.`
> - `Hidden bending and overfitting: the story quietly shifts dates, routes, or rituals, then the scene is tuned to one fragile claim.`
> `[Trust Risk]`
> `[Source Bias]`
> `[Scene Integrity]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Decoration vs. Validation
> **Subhead**: *The split that decides whether the audience believes the world.*
>
> | Decoration Mode | Validation Mode |
> | :--- | :--- |
> | `Evidence after cut` | `Evidence before cut` |
>
> - Decoration adds history as surface detail.
> - Validation makes history part of the scene's logic.

---

## Slide 5: One Sheet, Three Zones `^slide_script_arc_timel_04`
- **Type**: `code_breakdown` | **Section**: 5 | **Time**: 05:32 - 06:06 (34.0s)
- **Cue Marker**: `[CODE: accuracy_sheet.yaml with core_events, liberties, adjacent_claims, and validation_checks]`

> [!quote] Spoken Teleprompter Anchor
> "Here is your move. Build a small accuracy sheet before the next cut. Put the core events in the close zone, mark every l..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Build the Accuracy Sheet Before the Next Cut`
> **Subhead**: A small YAML sheet turns historical claims into testable scene checks.
> ```yaml
> accuracy_sheet.yaml:
>   core_events:
>     - route: Trojan coast approach
>     - props: ship type and cargo
>     - ritual: temple offering
>     - date: season and campaign window
>   liberties:
>     - character dialogue
>     - dramatic weather
>   adjacent_claims:
>     - trade route variant
>   validation_checks:
>     - source match
>     - timeline consistency
>     - artifact compatibility
> ```
> - `Put core events in the close zone: the facts the scene depends on, such as route, props, ritual, and date.`
> - `Mark every liberty explicitly, so the audience can separate invented detail from defended history.`
> - `Flag adjacent claims that need one more source, then run the scene like a test: if it fails, fix the scene or lower the claim.`
> `[Accuracy Sheet]`
> `[Scene Test]`
> `[Liberty Control]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: One Sheet, Three Zones
> **Subhead**: *A practical move before the next cut.*
> - Lock core events, mark liberties, flag adjacent claims.
> - Run the scene as a test: route, props, ritual, date.
> **Core Zone**: `4` ()
> **Liberties**: `Marked` ()
> **Adjacent Claims**: `Flagged` ()

---