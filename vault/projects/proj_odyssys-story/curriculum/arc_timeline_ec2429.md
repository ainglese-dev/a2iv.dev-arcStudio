---
ai_metadata:
  duration_ms: 42810
  fallback_occurred: false
  fallback_reason: null
  model: qwen3.8-27b
  provider: openai_compatible
arc_id: arc_timeline_ec2429
created_at: '2026-09-07T23:09:55.013837+00:00'
description: A 3-episode quick-explainer arc that turns the Odyssys timeline into
  a failure model for money under stress. It uses recent Nolan history-accuracy comments
  as the entry point, then resolves proximity to historic facts by testing timeline
  claims against written policy controls, withdrawal rules, cash drag, and sequence-of-returns
  risk. The final episode gives a Docker/Python terminal lab to stress-test a 10-year
  timeline before a drawdown becomes a post-mortem.
episodes:
- episode_id: arc_timeline_ec2429_ep1
  episode_number: 1
  hook: You open a 10-year timeline and see a drawdown you never planned for. The
    market was fine, but your withdrawal rule bled you dry. You are about to present
    a broken plan. Stop treating Odyssys as a patience story. Treat it as a failure
    model.
  key_facts_referenced:
  - fact_fundamentals_of_illiad_an_01_c8e2
  - fact_fundamentals_of_illiad_an_02_a8b6
  - fact_fundamentals_of_illiad_an_05_7315
  - fact_fundamentals_of_illiad_an_06_8c96
  lab_exercise: null
  learning_objectives:
  - 'Map the Odyssys timeline to three money-under-stress failure modes: cash drag,
    withdrawal rule, and missing written policy.'
  - Explain why cash drag in a high interest rate regime is not neutral.
  - Identify the minimum written policy controls needed before a timeline is trusted.
  - Use failure-model language instead of patience-story language when reviewing a
    timeline.
  recommended_visuals:
  - 'Split-screen: left side shows a scroll labeled ''patience story'', right side
    shows a 10-year timeline with drawdown spikes labeled ''failure model''.'
  - 'Cash drag diagram: idle cash line versus invested line in a high-rate regime,
    with the opportunity-cost gap shaded red.'
  - 'Written policy checklist card: target allocation, cash cap, rebalance bands,
    taxable account placement, withdrawal rule, review cadence.'
  - 'Odyssys journey map with stops converted into stress checkpoints: departure,
    drawdown, withdrawal, recovery, review.'
  target_duration_minutes: 6
  tier: fundamentals
  title: 'Odyssys Timeline: Money Under Stress, Not Patience'
- episode_id: arc_timeline_ec2429_ep2
  episode_number: 2
  hook: Your backtest looks clean, but the withdrawal sequence is hiding the real
    failure. Tax drag is invisible, and a missing deployment rule turns DCA into guesswork.
    You are about to ship a timeline that breaks in the first drawdown. Build the
    sequence-of-returns check first.
  key_facts_referenced:
  - fact_fundamentals_of_illiad_an_05_7315
  - fact_fundamentals_of_illiad_an_04_9906
  - fact_fundamentals_of_illiad_an_03_e787
  lab_exercise: null
  learning_objectives:
  - Separate market return from withdrawal rule when diagnosing sequence-of-returns
    risk.
  - Quantify taxable account drag by comparing after-tax returns instead of gross
    benchmarks.
  - Convert DCA versus lump-sum decisions into a prewritten deployment rule.
  - Build a sequence-of-returns check for a 10-year timeline before client review.
  recommended_visuals:
  - Two identical market return paths with different withdrawal rules, ending balances
    diverging after year 3.
  - 'Tax drag overlay: gross benchmark line versus after-tax line, with the invisible
    gap highlighted in amber.'
  - 'DCA decision tree: prewritten deployment rule on the left, ad hoc deployment
    on the right, with failure branches marked.'
  - 'Sequence-of-returns table: early drawdown, mid drawdown, late drawdown, and the
    withdrawal rule that changes the outcome.'
  target_duration_minutes: 6
  tier: advanced
  title: 'Sequence of Returns: The Withdrawal Rule That Breaks Your Timeline'
- episode_id: arc_timeline_ec2429_ep3
  episode_number: 3
  hook: You need a timeline lab before the next drawdown, not after. Your policy is
    a folder of notes, your cash drag is unmeasured, and your rebalance bands are
    guesses. You are about to explain a broken plan. Run a terminal timeline and stress-test
    withdrawal rule.
  key_facts_referenced:
  - fact_fundamentals_of_illiad_an_07_5504
  - fact_fundamentals_of_illiad_an_06_8c96
  - fact_fundamentals_of_illiad_an_05_7315
  - fact_fundamentals_of_illiad_an_02_a8b6
  lab_exercise: "docker run --rm -i -v $(pwd):/work -w /work python:3.12-slim python
    - <<'PY'\nimport csv, random\nrandom.seed(7)\nstart = 100000\nbalance = start\nrows
    = []\nfor y in range(2015, 2025):\n    ret = random.uniform(-0.25, 0.15)\n    cash_drag
    = 0.02 if y % 3 == 0 else 0.0\n    net = ret - cash_drag\n    balance *= (1 +
    net)\n    withdrawal = 0.04 * start\n    balance -= withdrawal\n    rows.append((y,
    ret, cash_drag, withdrawal, round(balance, 2)))\nwith open('timeline.csv', 'w',
    newline='') as f:\n    w = csv.writer(f)\n    w.writerow(['year', 'return', 'cash_drag',
    'withdrawal', 'balance'])\n    w.writerows(rows)\nprint('timeline.csv written')\nPY"
  learning_objectives:
  - Generate a 10-year timeline CSV with returns, cash drag, withdrawal, and balance.
  - Stress-test a fixed withdrawal rule against drawdown years in a terminal environment.
  - Add rebalance bands and review cadence as policy controls in the timeline model.
  - Diagnose post-drawdown planning failure before it becomes a post-mortem.
  recommended_visuals:
  - 'Terminal screen recording: Docker run, Python heredoc, and timeline.csv output
    with year, return, cash_drag, withdrawal, balance.'
  - 'Chart: balance line with drawdown years shaded red and cash drag years marked
    with amber dots.'
  - 'Policy control panel: cash cap, rebalance bands, withdrawal rule, and review
    cadence toggles.'
  - 'Post-mortem board: missing control, failure mode, timeline impact, and the one-line
    fix.'
  target_duration_minutes: 7
  tier: lab
  title: 'Terminal Timeline Lab: Stress-Test Drawdowns Before They Hit'
estimated_total_minutes: 19
sources_referenced:
- src_seed_fundamentals_of_illiad_an_c3f0e6
title: 'Odyssys Timeline: Stress-Testing Money Under Stress'
topic: timeline
total_episodes: 3
---

# Odyssys Timeline: Stress-Testing Money Under Stress

> [!abstract] Course Arc Overview
> **Topic**: timeline
> **Episodes**: 3 videos (~19 mins total)
> A 3-episode quick-explainer arc that turns the Odyssys timeline into a failure model for money under stress. It uses recent Nolan history-accuracy comments as the entry point, then resolves proximity to historic facts by testing timeline claims against written policy controls, withdrawal rules, cash drag, and sequence-of-returns risk. The final episode gives a Docker/Python terminal lab to stress-test a 10-year timeline before a drawdown becomes a post-mortem.

## Episode Progression Table

| # | Tier | Title | Duration | Grounded Facts |
|---|------|-------|----------|----------------|
| 1 | 🟢 Fundamentals | Odyssys Timeline: Money Under Stress, Not Patience | 6 min | [[facts/fact_fundamentals_of_illiad_an_01_c8e2]], [[facts/fact_fundamentals_of_illiad_an_02_a8b6]], [[facts/fact_fundamentals_of_illiad_an_05_7315]], [[facts/fact_fundamentals_of_illiad_an_06_8c96]] |
| 2 | 🟡 Advanced | Sequence of Returns: The Withdrawal Rule That Breaks Your Timeline | 6 min | [[facts/fact_fundamentals_of_illiad_an_05_7315]], [[facts/fact_fundamentals_of_illiad_an_04_9906]], [[facts/fact_fundamentals_of_illiad_an_03_e787]] |
| 3 | 🔴 Lab / Hands-On | Terminal Timeline Lab: Stress-Test Drawdowns Before They Hit | 7 min | [[facts/fact_fundamentals_of_illiad_an_07_5504]], [[facts/fact_fundamentals_of_illiad_an_06_8c96]], [[facts/fact_fundamentals_of_illiad_an_05_7315]], [[facts/fact_fundamentals_of_illiad_an_02_a8b6]] |

---

## Detailed Episode Breakdowns

### Episode 1: Odyssys Timeline: Money Under Stress, Not Patience
- **Episode ID**: `arc_timeline_ec2429_ep1`
- **Tier**: 🟢 Fundamentals
- **Target Duration**: 6 minutes
- **Hook**: *"You open a 10-year timeline and see a drawdown you never planned for. The market was fine, but your withdrawal rule bled you dry. You are about to present a broken plan. Stop treating Odyssys as a patience story. Treat it as a failure model."*

#### Learning Objectives
- Map the Odyssys timeline to three money-under-stress failure modes: cash drag, withdrawal rule, and missing written policy.
- Explain why cash drag in a high interest rate regime is not neutral.
- Identify the minimum written policy controls needed before a timeline is trusted.
- Use failure-model language instead of patience-story language when reviewing a timeline.

#### Grounded Vault Facts
- [[facts/fact_fundamentals_of_illiad_an_01_c8e2]]
- [[facts/fact_fundamentals_of_illiad_an_02_a8b6]]
- [[facts/fact_fundamentals_of_illiad_an_05_7315]]
- [[facts/fact_fundamentals_of_illiad_an_06_8c96]]

#### Recommended Visuals / Slides
- Split-screen: left side shows a scroll labeled 'patience story', right side shows a 10-year timeline with drawdown spikes labeled 'failure model'.
- Cash drag diagram: idle cash line versus invested line in a high-rate regime, with the opportunity-cost gap shaded red.
- Written policy checklist card: target allocation, cash cap, rebalance bands, taxable account placement, withdrawal rule, review cadence.
- Odyssys journey map with stops converted into stress checkpoints: departure, drawdown, withdrawal, recovery, review.

---

### Episode 2: Sequence of Returns: The Withdrawal Rule That Breaks Your Timeline
- **Episode ID**: `arc_timeline_ec2429_ep2`
- **Tier**: 🟡 Advanced
- **Target Duration**: 6 minutes
- **Hook**: *"Your backtest looks clean, but the withdrawal sequence is hiding the real failure. Tax drag is invisible, and a missing deployment rule turns DCA into guesswork. You are about to ship a timeline that breaks in the first drawdown. Build the sequence-of-returns check first."*

#### Learning Objectives
- Separate market return from withdrawal rule when diagnosing sequence-of-returns risk.
- Quantify taxable account drag by comparing after-tax returns instead of gross benchmarks.
- Convert DCA versus lump-sum decisions into a prewritten deployment rule.
- Build a sequence-of-returns check for a 10-year timeline before client review.

#### Grounded Vault Facts
- [[facts/fact_fundamentals_of_illiad_an_05_7315]]
- [[facts/fact_fundamentals_of_illiad_an_04_9906]]
- [[facts/fact_fundamentals_of_illiad_an_03_e787]]

#### Recommended Visuals / Slides
- Two identical market return paths with different withdrawal rules, ending balances diverging after year 3.
- Tax drag overlay: gross benchmark line versus after-tax line, with the invisible gap highlighted in amber.
- DCA decision tree: prewritten deployment rule on the left, ad hoc deployment on the right, with failure branches marked.
- Sequence-of-returns table: early drawdown, mid drawdown, late drawdown, and the withdrawal rule that changes the outcome.

---

### Episode 3: Terminal Timeline Lab: Stress-Test Drawdowns Before They Hit
- **Episode ID**: `arc_timeline_ec2429_ep3`
- **Tier**: 🔴 Lab / Hands-On
- **Target Duration**: 7 minutes
- **Hook**: *"You need a timeline lab before the next drawdown, not after. Your policy is a folder of notes, your cash drag is unmeasured, and your rebalance bands are guesses. You are about to explain a broken plan. Run a terminal timeline and stress-test withdrawal rule."*

#### Learning Objectives
- Generate a 10-year timeline CSV with returns, cash drag, withdrawal, and balance.
- Stress-test a fixed withdrawal rule against drawdown years in a terminal environment.
- Add rebalance bands and review cadence as policy controls in the timeline model.
- Diagnose post-drawdown planning failure before it becomes a post-mortem.

#### Grounded Vault Facts
- [[facts/fact_fundamentals_of_illiad_an_07_5504]]
- [[facts/fact_fundamentals_of_illiad_an_06_8c96]]
- [[facts/fact_fundamentals_of_illiad_an_05_7315]]
- [[facts/fact_fundamentals_of_illiad_an_02_a8b6]]

#### Recommended Visuals / Slides
- Terminal screen recording: Docker run, Python heredoc, and timeline.csv output with year, return, cash_drag, withdrawal, balance.
- Chart: balance line with drawdown years shaded red and cash drag years marked with amber dots.
- Policy control panel: cash cap, rebalance bands, withdrawal rule, and review cadence toggles.
- Post-mortem board: missing control, failure mode, timeline impact, and the one-line fix.

> [!example] Hands-On Lab Challenge
> docker run --rm -i -v $(pwd):/work -w /work python:3.12-slim python - <<'PY'
import csv, random
random.seed(7)
start = 100000
balance = start
rows = []
for y in range(2015, 2025):
    ret = random.uniform(-0.25, 0.15)
    cash_drag = 0.02 if y % 3 == 0 else 0.0
    net = ret - cash_drag
    balance *= (1 + net)
    withdrawal = 0.04 * start
    balance -= withdrawal
    rows.append((y, ret, cash_drag, withdrawal, round(balance, 2)))
with open('timeline.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['year', 'return', 'cash_drag', 'withdrawal', 'balance'])
    w.writerows(rows)
print('timeline.csv written')
PY

---