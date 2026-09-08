---
ai_metadata:
  domain: narrative_cinema
  generator: ai_router
  model: qwen3.8-27b
  provider: openai_compatible
created_at: '2026-09-08T16:40:38.985257+00:00'
deck_id: deck_script_arc_timeline_ec2429_ep2_2_e5c53d
metrics:
  cue_coverage_percentage: 100.0
  pacing_alignment_score: 98.5
  variant_a_avg_words_per_slide: 120.8
  variant_a_cognitive_load_score: 100.0
  variant_b_avg_words_per_slide: 40.6
  variant_b_cognitive_load_score: 100.0
script_id: script_arc_timeline_ec2429_ep2_2f23aa
script_title: 'Arc Timeline Ec2429 Ep2: History Accuracy as Load-Bearing Story Architecture'
slides:
- cue_marker: '[SLIDE: Timeline Collapse: Armor Wrong, Rigging Wrong, Consultant Correcting]'
  duration_s: 30.0
  section_index: 0
  slide_id: slide_script_arc_timel_00
  slide_index: 0
  slide_type: title_hook
  spoken_anchor_text: Your timeline collapses in the edit bay. A battle sequence looks
    epic, but the armor is wrong, the ship rigging is wrong...
  timestamp_end_s: 30.0
  timestamp_start_s: 0.0
  title: The Edit Bay Collapse
  variant_a:
    badge_pills:
    - Narrative Cinema
    - Historical Accuracy
    - Edit Bay
    bullet_points:
    - 'The edit bay exposes surface errors: wrong armor, wrong ship rigging, and a
      historical consultant drafting a public correction.'
    - Months of production can feel like a costume party wearing a war when details
      contradict the story's cause-and-effect.
    - The fix is not more decoration; it is a load-bearing timeline that survives
      scrutiny before the film is cut.
    code_language: screenplay
    code_snippet: 'INT. EDIT BAY - NIGHT


      A battle sequence plays. Armor glints. Rigging snaps.


      CONSULTANT (V.O.)

      The sail is wrong. The date is wrong. The scene is wrong.'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Epic Battle
      status: Looks right
      type: Scene
    - label: Armor/Rigging Error
      status: Visible
      type: Accuracy failure
    - label: Public Correction
      status: Drafted
      type: Reputational risk
    headline: 'The Edit Bay Collapse: Armor, Rigging, and the Consultant''s Correction'
    metric_callouts: []
    subhead: A battle can look epic and still fail because the timeline logic is missing.
    word_count: 124
  variant_b:
    badge_pills:
    - Hook
    bullet_points:
    - Armor and rigging errors turn a battle into a costume party.
    - A consultant's correction can make the timeline problem public.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Armor and rigging are wrong
      status: Looks right
      title: Epic Battle
    comparison_right:
      color: amber
      note: Timeline logic is exposed
      status: Correction drafted
      title: Consultant Alert
    diagram_nodes: []
    headline: The Edit Bay Collapse
    metric_callouts: []
    subhead: When the film looks epic but the history does not hold.
    word_count: 44
- cue_marker: '[DIAGRAM: Surface Accuracy vs Structural Timeline: costume details
    vs cause-and-effect dependencies]'
  duration_s: 67.0
  section_index: 1
  slide_id: slide_script_arc_timel_01
  slide_index: 1
  slide_type: comparison_split
  spoken_anchor_text: Most history-driven films fail because they treat accuracy as
    a costume department problem. You get the right helmet, th...
  timestamp_end_s: 97.0
  timestamp_start_s: 30.0
  title: Why Surface Accuracy Fails
  variant_a:
    badge_pills:
    - Narrative Structure
    - Historical Logic
    - Failure Mode
    bullet_points:
    - 'History-driven films often treat accuracy as a costume department problem:
      visible props, banners, dialect, and armor.'
    - The scene still breaks when a character knows something they could not know,
      or a siege happens before its cause.
    - 'Structural timeline logic is load-bearing: it controls knowledge, sequence,
      geography, and consequence.'
    code_language: markdown
    code_snippet: 'Surface accuracy: helmet, banner, dialect

      Structural timeline: who knows what, when, why, and what follows'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Surface Accuracy
      status: Visible but fragile
      type: Costume details
    - label: Structural Timeline
      status: Load-bearing
      type: Cause-and-effect
    - label: Scene Break
      status: Audience detects
      type: Impossible knowledge
    headline: 'Why Surface Accuracy Fails: Costume Details Without Timeline Logic'
    metric_callouts: []
    subhead: The right helmet, banner, and dialect cannot save a scene whose cause-and-effect
      is broken.
    word_count: 103
  variant_b:
    badge_pills:
    - Problem Breakdown
    bullet_points:
    - Surface accuracy fixes what the camera sees.
    - Structural timeline fixes what the audience believes.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Right helmet, banner, dialect
      status: Costume correct
      title: Surface Accuracy
    comparison_right:
      color: emerald
      note: Cause, knowledge, sequence
      status: Logic correct
      title: Structural Timeline
    diagram_nodes: []
    headline: Surface Accuracy vs Structural Timeline
    metric_callouts: []
    subhead: Costume correctness is not story correctness.
    word_count: 35
- cue_marker: '[CODE: timeline_ledger: scene | date | fact_type | source | risk |
    fix | proximity: inside/adjacent/outside]'
  duration_s: 163.0
  section_index: 2
  slide_id: slide_script_arc_timel_02
  slide_index: 2
  slide_type: code_breakdown
  spoken_anchor_text: Here is the practical model. Treat historical accuracy like
    a system architecture, not a checklist. The general engineer...
  timestamp_end_s: 260.0
  timestamp_start_s: 97.0
  title: The Proximity Test
  variant_a:
    badge_pills:
    - Timeline Ledger
    - Proximity Test
    - Source of Truth
    bullet_points:
    - 'Treat historical accuracy like a system architecture, not a checklist: hard
      facts, contextual facts, and flagged invention.'
    - Hard facts include dates, geography, technology, law, and religion; each needs
      a source, risk, and fix.
    - Proximity marks each scene as inside, adjacent, or outside the historic record,
      so invention is visible and controlled.
    code_language: markdown
    code_snippet: 'timeline_ledger:

      scene | date | fact_type | source | risk | fix | proximity

      S12 | 490 BCE | ship rigging | primary account | anachronistic sail | replace
      rig | inside

      S14 | 490 BCE | commander knowledge | inferred context | knows too soon | delay
      reveal | adjacent

      S15 | 490 BCE | battle outcome | invented connective | changes history | mark
      as outside | outside'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Hard Facts
      status: Dates, geography, technology, law, religion
      type: Inside record
    - label: Adjacent Inference
      status: Flagged and sourced
      type: Plausible context
    - label: Invented Connective
      status: Story glue, marked
      type: Outside record
    headline: 'The Proximity Test: Accuracy as System Architecture'
    metric_callouts: []
    subhead: Define constraints, map dependencies, and keep one source of truth for
      the historical record.
    word_count: 161
  variant_b:
    badge_pills:
    - Deep Dive
    bullet_points:
    - 'Inside: verified hard facts with source and risk.'
    - 'Adjacent: plausible context that is flagged and tested.'
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Inside, Adjacent, Outside
    metric_callouts:
    - detail: Hard facts with source
      label: Inside
      value: Verified
    - detail: Contextual inference
      label: Adjacent
      value: Plausible
    - detail: Story glue, marked
      label: Outside
      value: Invented
    subhead: A simple proximity test keeps history from becoming a checklist.
    word_count: 37
- cue_marker: '[DIAGRAM: Four Failure Modes: source stacking, decorative accuracy,
    invisible invention, timeline drift]'
  duration_s: 65.0
  section_index: 3
  slide_id: slide_script_arc_timel_03
  slide_index: 3
  slide_type: architecture_diagram
  spoken_anchor_text: The first pitfall is source stacking. You collect ten historians,
    five books, and a hundred forum threads, then you free...
  timestamp_end_s: 325.0
  timestamp_start_s: 260.0
  title: Four Ways the Timeline Breaks
  variant_a:
    badge_pills:
    - Failure Modes
    - Timeline Logic
    - Story Risk
    bullet_points:
    - 'Source stacking: ten historians, five books, and forum threads freeze the film
      into a research project.'
    - 'Decorative accuracy: props look correct while politics, knowledge, and sequence
      remain wrong.'
    - 'Invisible invention and timeline drift: unflagged invention and small sequence
      slips compound into impossible history.'
    code_language: markdown
    code_snippet: 'Failure modes:

      1. Source stacking -> research paralysis

      2. Decorative accuracy -> props over politics

      3. Invisible invention -> unflagged story glue

      4. Timeline drift -> sequence slips compound'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Source Stacking
      status: Frozen
      type: Research paralysis
    - label: Decorative Accuracy
      status: Misleading
      type: Props over politics
    - label: Invisible Invention
      status: Undetected
      type: Unflagged invention
    - label: Timeline Drift
      status: Compounding
      type: Sequence slip
    headline: Four Ways the Timeline Breaks
    metric_callouts: []
    subhead: Research, decoration, invention, and drift can each destroy historical
      credibility.
    word_count: 110
  variant_b:
    badge_pills:
    - Pitfalls
    bullet_points:
    - Source stacking and decorative accuracy make the film look researched but feel
      wrong.
    - Invisible invention and timeline drift let impossible history accumulate.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Stacking, decoration, invention, drift
      status: Timeline breaks
      title: Research Project
    comparison_right:
      color: emerald
      note: Ledger, proximity, human logic
      status: Timeline holds
      title: Story Engine
    diagram_nodes: []
    headline: Research Project vs Story Engine
    metric_callouts: []
    subhead: The timeline breaks when accuracy stops serving the story.
    word_count: 45
- cue_marker: '[SLIDE: Action: Build the ledger, mark proximity, test human logic]'
  duration_s: 37.0
  section_index: 4
  slide_id: slide_script_arc_timel_04
  slide_index: 4
  slide_type: key_takeaway
  spoken_anchor_text: So here is your move. Build the timeline ledger before you shoot.
    Mark every scene as inside, adjacent, or outside the h...
  timestamp_end_s: 362.0
  timestamp_start_s: 325.0
  title: Build the Ledger Before You Shoot
  variant_a:
    badge_pills:
    - Action Plan
    - Timeline Ledger
    - Human Logic
    bullet_points:
    - 'Build the timeline ledger before shooting: every scene gets a date, fact type,
      source, risk, and fix.'
    - Mark every scene as inside, adjacent, or outside the historic record so invention
      is visible.
    - 'Test the story against human logic, not costume logic: knowledge, sequence,
      and stakes must hold.'
    code_language: markdown
    code_snippet: 'Action plan:

      1. Build timeline ledger

      2. Mark proximity: inside / adjacent / outside

      3. Assign source, risk, fix

      4. Test human logic'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: Build Ledger
      status: Before shoot
      type: Pre-production
    - label: Mark Proximity
      status: Flagged
      type: Inside/Adjacent/Outside
    - label: Test Human Logic
      status: Close enough to history
      type: Story validation
    headline: Build the Ledger Before You Shoot
    metric_callouts: []
    subhead: Mark proximity, assign source/risk/fix, and test human logic before the
      scene is filmed.
    word_count: 106
  variant_b:
    badge_pills:
    - Action Call
    bullet_points:
    - Mark every scene as inside, adjacent, or outside the record.
    - Give each fact a source, a risk, and a fix.
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Props, dialect, banners
      status: Looks right
      title: Costume Logic
    comparison_right:
      color: emerald
      note: Knowledge, sequence, stakes
      status: Story holds
      title: Human Logic
    diagram_nodes: []
    headline: Build the Ledger Before You Shoot
    metric_callouts: []
    subhead: A practical move for history-driven films.
    word_count: 42
total_duration_s: 362.0
total_slides: 5
---

# Presentation Deck: Arc Timeline Ec2429 Ep2: History Accuracy as Load-Bearing Story Architecture

> [!abstract] Presentation Deck Overview
> - **Deck ID**: `deck_script_arc_timeline_ec2429_ep2_2_e5c53d` | **Script ID**: `[[scripts/script_arc_timeline_ec2429_ep2_2f23aa|script_arc_timeline_ec2429_ep2_2f23aa]]`
> - **Slide Count**: 5 slides | **Total Duration**: 06:02 (362.0s)
> - **Cue Coverage**: 100.0% | **Pacing Alignment**: 98.5%
>
> ### A/B Comparative Benchmarks
> - **Variant A (Terminal Dark)**: Words/Slide: **120.8** | Cognitive Load: **100.0/100**
> - **Variant B (Infographic Clean)**: Words/Slide: **40.6** | Cognitive Load: **100.0/100**

---

## Slide 1: The Edit Bay Collapse `^slide_script_arc_timel_00`
- **Type**: `title_hook` | **Section**: 1 | **Time**: 00:00 - 00:30 (30.0s)
- **Cue Marker**: `[SLIDE: Timeline Collapse: Armor Wrong, Rigging Wrong, Consultant Correcting]`

> [!quote] Spoken Teleprompter Anchor
> "Your timeline collapses in the edit bay. A battle sequence looks epic, but the armor is wrong, the ship rigging is wrong..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `The Edit Bay Collapse: Armor, Rigging, and the Consultant's Correction`
> **Subhead**: A battle can look epic and still fail because the timeline logic is missing.
> ```screenplay
> INT. EDIT BAY - NIGHT
> 
> A battle sequence plays. Armor glints. Rigging snaps.
> 
> CONSULTANT (V.O.)
> The sail is wrong. The date is wrong. The scene is wrong.
> ```
> - `The edit bay exposes surface errors: wrong armor, wrong ship rigging, and a historical consultant drafting a public correction.`
> - `Months of production can feel like a costume party wearing a war when details contradict the story's cause-and-effect.`
> - `The fix is not more decoration; it is a load-bearing timeline that survives scrutiny before the film is cut.`
> `[Narrative Cinema]`
> `[Historical Accuracy]`
> `[Edit Bay]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: The Edit Bay Collapse
> **Subhead**: *When the film looks epic but the history does not hold.*
>
> | Epic Battle | Consultant Alert |
> | :--- | :--- |
> | `Looks right` | `Correction drafted` |
>
> - Armor and rigging errors turn a battle into a costume party.
> - A consultant's correction can make the timeline problem public.

---

## Slide 2: Surface Accuracy vs Structural Timeline `^slide_script_arc_timel_01`
- **Type**: `comparison_split` | **Section**: 2 | **Time**: 00:30 - 01:37 (67.0s)
- **Cue Marker**: `[DIAGRAM: Surface Accuracy vs Structural Timeline: costume details vs cause-and-effect dependencies]`

> [!quote] Spoken Teleprompter Anchor
> "Most history-driven films fail because they treat accuracy as a costume department problem. You get the right helmet, th..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Why Surface Accuracy Fails: Costume Details Without Timeline Logic`
> **Subhead**: The right helmet, banner, and dialect cannot save a scene whose cause-and-effect is broken.
> ```markdown
> Surface accuracy: helmet, banner, dialect
> Structural timeline: who knows what, when, why, and what follows
> ```
> - `History-driven films often treat accuracy as a costume department problem: visible props, banners, dialect, and armor.`
> - `The scene still breaks when a character knows something they could not know, or a siege happens before its cause.`
> - `Structural timeline logic is load-bearing: it controls knowledge, sequence, geography, and consequence.`
> `[Narrative Structure]`
> `[Historical Logic]`
> `[Failure Mode]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Surface Accuracy vs Structural Timeline
> **Subhead**: *Costume correctness is not story correctness.*
>
> | Surface Accuracy | Structural Timeline |
> | :--- | :--- |
> | `Costume correct` | `Logic correct` |
>
> - Surface accuracy fixes what the camera sees.
> - Structural timeline fixes what the audience believes.

---

## Slide 3: Inside, Adjacent, Outside `^slide_script_arc_timel_02`
- **Type**: `code_breakdown` | **Section**: 3 | **Time**: 01:37 - 04:20 (163.0s)
- **Cue Marker**: `[CODE: timeline_ledger: scene | date | fact_type | source | risk | fix | proximity: inside/adjacent/outside]`

> [!quote] Spoken Teleprompter Anchor
> "Here is the practical model. Treat historical accuracy like a system architecture, not a checklist. The general engineer..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `The Proximity Test: Accuracy as System Architecture`
> **Subhead**: Define constraints, map dependencies, and keep one source of truth for the historical record.
> ```markdown
> timeline_ledger:
> scene | date | fact_type | source | risk | fix | proximity
> S12 | 490 BCE | ship rigging | primary account | anachronistic sail | replace rig | inside
> S14 | 490 BCE | commander knowledge | inferred context | knows too soon | delay reveal | adjacent
> S15 | 490 BCE | battle outcome | invented connective | changes history | mark as outside | outside
> ```
> - `Treat historical accuracy like a system architecture, not a checklist: hard facts, contextual facts, and flagged invention.`
> - `Hard facts include dates, geography, technology, law, and religion; each needs a source, risk, and fix.`
> - `Proximity marks each scene as inside, adjacent, or outside the historic record, so invention is visible and controlled.`
> `[Timeline Ledger]`
> `[Proximity Test]`
> `[Source of Truth]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Inside, Adjacent, Outside
> **Subhead**: *A simple proximity test keeps history from becoming a checklist.*
> - Inside: verified hard facts with source and risk.
> - Adjacent: plausible context that is flagged and tested.
> **Inside**: `Verified` ()
> **Adjacent**: `Plausible` ()
> **Outside**: `Invented` ()

---

## Slide 4: Research Project vs Story Engine `^slide_script_arc_timel_03`
- **Type**: `architecture_diagram` | **Section**: 4 | **Time**: 04:20 - 05:25 (65.0s)
- **Cue Marker**: `[DIAGRAM: Four Failure Modes: source stacking, decorative accuracy, invisible invention, timeline drift]`

> [!quote] Spoken Teleprompter Anchor
> "The first pitfall is source stacking. You collect ten historians, five books, and a hundred forum threads, then you free..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Four Ways the Timeline Breaks`
> **Subhead**: Research, decoration, invention, and drift can each destroy historical credibility.
> ```markdown
> Failure modes:
> 1. Source stacking -> research paralysis
> 2. Decorative accuracy -> props over politics
> 3. Invisible invention -> unflagged story glue
> 4. Timeline drift -> sequence slips compound
> ```
> - `Source stacking: ten historians, five books, and forum threads freeze the film into a research project.`
> - `Decorative accuracy: props look correct while politics, knowledge, and sequence remain wrong.`
> - `Invisible invention and timeline drift: unflagged invention and small sequence slips compound into impossible history.`
> `[Failure Modes]`
> `[Timeline Logic]`
> `[Story Risk]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Research Project vs Story Engine
> **Subhead**: *The timeline breaks when accuracy stops serving the story.*
>
> | Research Project | Story Engine |
> | :--- | :--- |
> | `Timeline breaks` | `Timeline holds` |
>
> - Source stacking and decorative accuracy make the film look researched but feel wrong.
> - Invisible invention and timeline drift let impossible history accumulate.

---

## Slide 5: Build the Ledger Before You Shoot `^slide_script_arc_timel_04`
- **Type**: `key_takeaway` | **Section**: 5 | **Time**: 05:25 - 06:02 (37.0s)
- **Cue Marker**: `[SLIDE: Action: Build the ledger, mark proximity, test human logic]`

> [!quote] Spoken Teleprompter Anchor
> "So here is your move. Build the timeline ledger before you shoot. Mark every scene as inside, adjacent, or outside the h..."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Build the Ledger Before You Shoot`
> **Subhead**: Mark proximity, assign source/risk/fix, and test human logic before the scene is filmed.
> ```markdown
> Action plan:
> 1. Build timeline ledger
> 2. Mark proximity: inside / adjacent / outside
> 3. Assign source, risk, fix
> 4. Test human logic
> ```
> - `Build the timeline ledger before shooting: every scene gets a date, fact type, source, risk, and fix.`
> - `Mark every scene as inside, adjacent, or outside the historic record so invention is visible.`
> - `Test the story against human logic, not costume logic: knowledge, sequence, and stakes must hold.`
> `[Action Plan]`
> `[Timeline Ledger]`
> `[Human Logic]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Build the Ledger Before You Shoot
> **Subhead**: *A practical move for history-driven films.*
>
> | Costume Logic | Human Logic |
> | :--- | :--- |
> | `Looks right` | `Story holds` |
>
> - Mark every scene as inside, adjacent, or outside the record.
> - Give each fact a source, a risk, and a fix.

---