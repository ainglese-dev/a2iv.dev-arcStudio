---
ai_metadata:
  duration_ms: 62740
  fallback_occurred: false
  fallback_reason: null
  model: qwen3.8-27b
  provider: openai_compatible
arc_id: arc_containerlabs_implementat_9d112e
created_at: '2026-09-08T14:52:50.846451+00:00'
description: A six-episode practitioner arc for turning a simple PC into a repeatable
  network lab using Containerlab, YAML topologies, and a thin Python runner. The course
  moves from core mental models and local failure modes to automated readiness checks,
  route-leak and MTU reproduction, and hands-on lab recipes that produce evidence
  you can defend in a post-mortem.
episodes:
- episode_id: arc_containerlabs_implementat_9d112e_ep1
  episode_number: 1
  hook: Your laptop is the only lab you have, and every network change is a blind
    guess. You push a config, wait, and hope nothing breaks in production. Stop guessing.
    Learn the one-file pattern that makes local network tests repeatable.
  key_facts_referenced:
  - fact_containerlabs_implementat_08_2f45
  - fact_containerlabs_implementat_01_b79a
  - fact_containerlabs_implementat_04_9562
  lab_exercise: null
  learning_objectives:
  - Model Containerlab network nodes as containers on a PC and links as veth pairs.
  - Create one YAML per scenario with nodes, links, and labels.
  - Use one Python runner to deploy, wait, test, collect logs, and tear down.
  - Store each run in one output directory so evidence is traceable.
  recommended_visuals:
  - 'Split-screen: left shows a PC with container nodes and veth links; right shows
    a folder tree with topology.yaml, runner.py, and run-001/.'
  - 'Animated flow: YAML topology -> containerlab deploy -> Python runner -> output
    directory with logs and test results.'
  target_duration_minutes: 6
  tier: fundamentals
  title: 'Containerlabs on a PC: One YAML, One Runner, One Output Directory'
- episode_id: arc_containerlabs_implementat_9d112e_ep2
  episode_number: 2
  hook: Your nodes start, but the links never come up. You stare at a nested VM, missing
    CAP_NET_ADMIN, and a production deadline is breathing down your neck. Stop blaming
    the YAML. Check the host kernel privileges before you burn another hour.
  key_facts_referenced:
  - fact_containerlabs_implementat_06_06eb
  - fact_containerlabs_implementat_01_b79a
  lab_exercise: null
  learning_objectives:
  - Diagnose missing veth pairs caused by missing CAP_NET_ADMIN or nested VM restrictions.
  - Run preflight checks for host kernel privileges before deploying a topology.
  - Distinguish node startup success from link creation failure.
  - Choose a supported host environment for reliable local Containerlabs runs.
  recommended_visuals:
  - 'Flow diagram: containerlab deploy -> node starts -> veth create blocked by missing
    CAP_NET_ADMIN -> link missing.'
  - Terminal overlay showing a node process running while the link table stays empty,
    with a red badge on the privilege gate.
  target_duration_minutes: 5
  tier: fundamentals
  title: 'Why Your Local Containerlab Lab Fails: Privileges, veth Pairs, and Nested
    VMs'
- episode_id: arc_containerlabs_implementat_9d112e_ep3
  episode_number: 3
  hook: Your test passes because the script finished, not because the network converged.
    You ship a flaky pipeline, and the next incident is on your name. Make the runner
    wait for real readiness, then assert packet paths before it tears down.
  key_facts_referenced:
  - fact_containerlabs_implementat_04_9562
  - fact_containerlabs_implementat_03_3a16
  - fact_containerlabs_implementat_08_2f45
  lab_exercise: null
  learning_objectives:
  - Implement readiness waits instead of fixed sleeps after deployment.
  - Run pytest or scapy traffic assertions after the topology is ready.
  - Collect logs and topology state into a single run directory.
  - Fail CI when a packet path breaks, not only when configuration syntax fails.
  recommended_visuals:
  - 'State machine: deploy -> readiness wait -> traffic test -> log collection ->
    teardown.'
  - CI pipeline diagram where a packet-path assertion turns the build red even if
    configuration parsing succeeds.
  target_duration_minutes: 7
  tier: advanced
  title: 'Automating Readiness: Deploy, Wait, Test, Collect Logs, Tear Down'
- episode_id: arc_containerlabs_implementat_9d112e_ep4
  episode_number: 4
  hook: A bad route leaks into the RIB, or a jumbo packet dies at a small MTU, and
    nobody can prove which change caused it. You are about to write a post-mortem
    from screenshots. Build a tiny topology, inject the fault, and capture the evidence.
  key_facts_referenced:
  - fact_containerlabs_implementat_02_0b88
  - fact_containerlabs_implementat_05_2b2a
  lab_exercise: null
  learning_objectives:
  - Build a three or four router BGP topology to reproduce a route leak.
  - Inject a bad route and assert that the prefix does not appear in the RIB.
  - Lower a veth MTU and send a large UDP packet to test truncation.
  - Verify ICMP fragmentation needed as evidence of MTU failure.
  recommended_visuals:
  - 'Two-panel diagram: BGP topology with bad route injection and RIB diff; MTU diagram
    with a large UDP packet hitting a small veth and an ICMP fragmentation needed
    reply.'
  - Packet trace animation showing the UDP payload size, veth MTU, and the ICMP message
    returned to the sender.
  target_duration_minutes: 7
  tier: advanced
  title: Reproducing Route Leaks and MTU Truncation in a Small Topology
- episode_id: arc_containerlabs_implementat_9d112e_ep5
  episode_number: 5
  hook: You have a YAML, a Python runner, and a laptop that should prove a route never
    leaks. If the test hangs, you need logs, not vibes. Deploy the topology, inject
    the bad prefix, assert the RIB, and keep the output directory clean.
  key_facts_referenced:
  - fact_containerlabs_implementat_02_0b88
  - fact_containerlabs_implementat_04_9562
  - fact_containerlabs_implementat_08_2f45
  - fact_containerlabs_implementat_03_3a16
  lab_exercise: "mkdir -p lab-route-leak/run-001 && cat > lab-route-leak/topology.yaml
    <<'YAML'\ntopology:\n  nodes:\n    r1: {kind: linux}\n    r2: {kind: linux}\n
    \   r3: {kind: linux}\n  links:\n    - endpoints: [r1:eth1, r2:eth1]\n    - endpoints:
    [r2:eth2, r3:eth1]\nYAML\npython lab-route-leak/runner.py --topology lab-route-leak/topology.yaml
    --run-dir lab-route-leak/run-001 --test route_leak && containerlab destroy --topology
    lab-route-leak/topology.yaml"
  learning_objectives:
  - Create a minimal BGP topology YAML and a Python runner for one run directory.
  - Deploy the topology, wait for BGP sessions, and inject a bad prefix.
  - Assert RIB state and save logs for post-mortem evidence.
  - Tear down cleanly so the next run starts from a known state.
  recommended_visuals:
  - 'Terminal split: left runs python runner.py, right shows containerlab deploy,
    BGP session check, pytest assertion, and the run directory with logs.'
  - Topology graph with r1, r2, and r3, a red injected prefix, and a green RIB assertion
    badge when the prefix is absent.
  target_duration_minutes: 6
  tier: lab
  title: 'Lab: Build a Containerlab BGP Route-Leak Test in 10 Minutes'
- episode_id: arc_containerlabs_implementat_9d112e_ep6
  episode_number: 6
  hook: Your dozen BGP speakers max out CPU, your MTU test times out, and you cannot
    tell if the network failed or your laptop did. You are about to blame a routing
    bug that is actually resource exhaustion. Right-size the topology and capture
    ICMP fragmentation needed.
  key_facts_referenced:
  - fact_containerlabs_implementat_05_2b2a
  - fact_containerlabs_implementat_07_dc62
  - fact_containerlabs_implementat_04_9562
  - fact_containerlabs_implementat_03_3a16
  lab_exercise: "mkdir -p lab-mtu/run-001 && cat > lab-mtu/topology.yaml <<'YAML'\ntopology:\n
    \ nodes:\n    r1: {kind: linux}\n    r2: {kind: linux}\n  links:\n    - endpoints:
    [r1:eth1, r2:eth1]\nYAML\npython lab-mtu/runner.py --topology lab-mtu/topology.yaml
    --run-dir lab-mtu/run-001 --test mtu --mtu 1000 --udp-size 1500 && containerlab
    destroy --topology lab-mtu/topology.yaml"
  learning_objectives:
  - Right-size BGP topologies to avoid CPU and memory saturation false timeouts.
  - Test MTU truncation by lowering a veth MTU and sending a large UDP packet.
  - Capture ICMP fragmentation needed and resource metrics in the run directory.
  - Use logs to separate a real network failure from host resource exhaustion.
  recommended_visuals:
  - Resource graph showing CPU and memory saturation causing false timeouts, with
    a smaller topology highlighted as the stable baseline.
  - MTU test diagram with a veth MTU lowered, a large UDP packet sent, and ICMP fragmentation
    needed captured in the run directory.
  target_duration_minutes: 7
  tier: lab
  title: 'Lab: Stress-Test MTU and Avoid False Failures from Saturated BGP Topologies'
estimated_total_minutes: 38
sources_referenced:
- src_seed_containerlabs_implementat_f27d6b
title: 'Containerlabs on a PC: From One YAML to Automated Network Tests'
topic: Containerlabs implementation on a PC and use-cases for real scenarios to turn
  a simple network into an automated one with simple python and yaml
total_episodes: 6
---

# Containerlabs on a PC: From One YAML to Automated Network Tests

> [!abstract] Course Arc Overview
> **Topic**: Containerlabs implementation on a PC and use-cases for real scenarios to turn a simple network into an automated one with simple python and yaml
> **Episodes**: 6 videos (~38 mins total)
> A six-episode practitioner arc for turning a simple PC into a repeatable network lab using Containerlab, YAML topologies, and a thin Python runner. The course moves from core mental models and local failure modes to automated readiness checks, route-leak and MTU reproduction, and hands-on lab recipes that produce evidence you can defend in a post-mortem.

## Episode Progression Table

| # | Tier | Title | Duration | Grounded Facts |
|---|------|-------|----------|----------------|
| 1 | 🟢 Fundamentals | Containerlabs on a PC: One YAML, One Runner, One Output Directory | 6 min | [[facts/fact_containerlabs_implementat_08_2f45]], [[facts/fact_containerlabs_implementat_01_b79a]], [[facts/fact_containerlabs_implementat_04_9562]] |
| 2 | 🟢 Fundamentals | Why Your Local Containerlab Lab Fails: Privileges, veth Pairs, and Nested VMs | 5 min | [[facts/fact_containerlabs_implementat_06_06eb]], [[facts/fact_containerlabs_implementat_01_b79a]] |
| 3 | 🟡 Advanced | Automating Readiness: Deploy, Wait, Test, Collect Logs, Tear Down | 7 min | [[facts/fact_containerlabs_implementat_04_9562]], [[facts/fact_containerlabs_implementat_03_3a16]], [[facts/fact_containerlabs_implementat_08_2f45]] |
| 4 | 🟡 Advanced | Reproducing Route Leaks and MTU Truncation in a Small Topology | 7 min | [[facts/fact_containerlabs_implementat_02_0b88]], [[facts/fact_containerlabs_implementat_05_2b2a]] |
| 5 | 🔴 Lab / Hands-On | Lab: Build a Containerlab BGP Route-Leak Test in 10 Minutes | 6 min | [[facts/fact_containerlabs_implementat_02_0b88]], [[facts/fact_containerlabs_implementat_04_9562]], [[facts/fact_containerlabs_implementat_08_2f45]], [[facts/fact_containerlabs_implementat_03_3a16]] |
| 6 | 🔴 Lab / Hands-On | Lab: Stress-Test MTU and Avoid False Failures from Saturated BGP Topologies | 7 min | [[facts/fact_containerlabs_implementat_05_2b2a]], [[facts/fact_containerlabs_implementat_07_dc62]], [[facts/fact_containerlabs_implementat_04_9562]], [[facts/fact_containerlabs_implementat_03_3a16]] |

---

## Detailed Episode Breakdowns

### Episode 1: Containerlabs on a PC: One YAML, One Runner, One Output Directory
- **Episode ID**: `arc_containerlabs_implementat_9d112e_ep1`
- **Tier**: 🟢 Fundamentals
- **Target Duration**: 6 minutes
- **Hook**: *"Your laptop is the only lab you have, and every network change is a blind guess. You push a config, wait, and hope nothing breaks in production. Stop guessing. Learn the one-file pattern that makes local network tests repeatable."*

#### Learning Objectives
- Model Containerlab network nodes as containers on a PC and links as veth pairs.
- Create one YAML per scenario with nodes, links, and labels.
- Use one Python runner to deploy, wait, test, collect logs, and tear down.
- Store each run in one output directory so evidence is traceable.

#### Grounded Vault Facts
- [[facts/fact_containerlabs_implementat_08_2f45]]
- [[facts/fact_containerlabs_implementat_01_b79a]]
- [[facts/fact_containerlabs_implementat_04_9562]]

#### Recommended Visuals / Slides
- Split-screen: left shows a PC with container nodes and veth links; right shows a folder tree with topology.yaml, runner.py, and run-001/.
- Animated flow: YAML topology -> containerlab deploy -> Python runner -> output directory with logs and test results.

---

### Episode 2: Why Your Local Containerlab Lab Fails: Privileges, veth Pairs, and Nested VMs
- **Episode ID**: `arc_containerlabs_implementat_9d112e_ep2`
- **Tier**: 🟢 Fundamentals
- **Target Duration**: 5 minutes
- **Hook**: *"Your nodes start, but the links never come up. You stare at a nested VM, missing CAP_NET_ADMIN, and a production deadline is breathing down your neck. Stop blaming the YAML. Check the host kernel privileges before you burn another hour."*

#### Learning Objectives
- Diagnose missing veth pairs caused by missing CAP_NET_ADMIN or nested VM restrictions.
- Run preflight checks for host kernel privileges before deploying a topology.
- Distinguish node startup success from link creation failure.
- Choose a supported host environment for reliable local Containerlabs runs.

#### Grounded Vault Facts
- [[facts/fact_containerlabs_implementat_06_06eb]]
- [[facts/fact_containerlabs_implementat_01_b79a]]

#### Recommended Visuals / Slides
- Flow diagram: containerlab deploy -> node starts -> veth create blocked by missing CAP_NET_ADMIN -> link missing.
- Terminal overlay showing a node process running while the link table stays empty, with a red badge on the privilege gate.

---

### Episode 3: Automating Readiness: Deploy, Wait, Test, Collect Logs, Tear Down
- **Episode ID**: `arc_containerlabs_implementat_9d112e_ep3`
- **Tier**: 🟡 Advanced
- **Target Duration**: 7 minutes
- **Hook**: *"Your test passes because the script finished, not because the network converged. You ship a flaky pipeline, and the next incident is on your name. Make the runner wait for real readiness, then assert packet paths before it tears down."*

#### Learning Objectives
- Implement readiness waits instead of fixed sleeps after deployment.
- Run pytest or scapy traffic assertions after the topology is ready.
- Collect logs and topology state into a single run directory.
- Fail CI when a packet path breaks, not only when configuration syntax fails.

#### Grounded Vault Facts
- [[facts/fact_containerlabs_implementat_04_9562]]
- [[facts/fact_containerlabs_implementat_03_3a16]]
- [[facts/fact_containerlabs_implementat_08_2f45]]

#### Recommended Visuals / Slides
- State machine: deploy -> readiness wait -> traffic test -> log collection -> teardown.
- CI pipeline diagram where a packet-path assertion turns the build red even if configuration parsing succeeds.

---

### Episode 4: Reproducing Route Leaks and MTU Truncation in a Small Topology
- **Episode ID**: `arc_containerlabs_implementat_9d112e_ep4`
- **Tier**: 🟡 Advanced
- **Target Duration**: 7 minutes
- **Hook**: *"A bad route leaks into the RIB, or a jumbo packet dies at a small MTU, and nobody can prove which change caused it. You are about to write a post-mortem from screenshots. Build a tiny topology, inject the fault, and capture the evidence."*

#### Learning Objectives
- Build a three or four router BGP topology to reproduce a route leak.
- Inject a bad route and assert that the prefix does not appear in the RIB.
- Lower a veth MTU and send a large UDP packet to test truncation.
- Verify ICMP fragmentation needed as evidence of MTU failure.

#### Grounded Vault Facts
- [[facts/fact_containerlabs_implementat_02_0b88]]
- [[facts/fact_containerlabs_implementat_05_2b2a]]

#### Recommended Visuals / Slides
- Two-panel diagram: BGP topology with bad route injection and RIB diff; MTU diagram with a large UDP packet hitting a small veth and an ICMP fragmentation needed reply.
- Packet trace animation showing the UDP payload size, veth MTU, and the ICMP message returned to the sender.

---

### Episode 5: Lab: Build a Containerlab BGP Route-Leak Test in 10 Minutes
- **Episode ID**: `arc_containerlabs_implementat_9d112e_ep5`
- **Tier**: 🔴 Lab / Hands-On
- **Target Duration**: 6 minutes
- **Hook**: *"You have a YAML, a Python runner, and a laptop that should prove a route never leaks. If the test hangs, you need logs, not vibes. Deploy the topology, inject the bad prefix, assert the RIB, and keep the output directory clean."*

#### Learning Objectives
- Create a minimal BGP topology YAML and a Python runner for one run directory.
- Deploy the topology, wait for BGP sessions, and inject a bad prefix.
- Assert RIB state and save logs for post-mortem evidence.
- Tear down cleanly so the next run starts from a known state.

#### Grounded Vault Facts
- [[facts/fact_containerlabs_implementat_02_0b88]]
- [[facts/fact_containerlabs_implementat_04_9562]]
- [[facts/fact_containerlabs_implementat_08_2f45]]
- [[facts/fact_containerlabs_implementat_03_3a16]]

#### Recommended Visuals / Slides
- Terminal split: left runs python runner.py, right shows containerlab deploy, BGP session check, pytest assertion, and the run directory with logs.
- Topology graph with r1, r2, and r3, a red injected prefix, and a green RIB assertion badge when the prefix is absent.

> [!example] Hands-On Lab Challenge
> mkdir -p lab-route-leak/run-001 && cat > lab-route-leak/topology.yaml <<'YAML'
topology:
  nodes:
    r1: {kind: linux}
    r2: {kind: linux}
    r3: {kind: linux}
  links:
    - endpoints: [r1:eth1, r2:eth1]
    - endpoints: [r2:eth2, r3:eth1]
YAML
python lab-route-leak/runner.py --topology lab-route-leak/topology.yaml --run-dir lab-route-leak/run-001 --test route_leak && containerlab destroy --topology lab-route-leak/topology.yaml

---

### Episode 6: Lab: Stress-Test MTU and Avoid False Failures from Saturated BGP Topologies
- **Episode ID**: `arc_containerlabs_implementat_9d112e_ep6`
- **Tier**: 🔴 Lab / Hands-On
- **Target Duration**: 7 minutes
- **Hook**: *"Your dozen BGP speakers max out CPU, your MTU test times out, and you cannot tell if the network failed or your laptop did. You are about to blame a routing bug that is actually resource exhaustion. Right-size the topology and capture ICMP fragmentation needed."*

#### Learning Objectives
- Right-size BGP topologies to avoid CPU and memory saturation false timeouts.
- Test MTU truncation by lowering a veth MTU and sending a large UDP packet.
- Capture ICMP fragmentation needed and resource metrics in the run directory.
- Use logs to separate a real network failure from host resource exhaustion.

#### Grounded Vault Facts
- [[facts/fact_containerlabs_implementat_05_2b2a]]
- [[facts/fact_containerlabs_implementat_07_dc62]]
- [[facts/fact_containerlabs_implementat_04_9562]]
- [[facts/fact_containerlabs_implementat_03_3a16]]

#### Recommended Visuals / Slides
- Resource graph showing CPU and memory saturation causing false timeouts, with a smaller topology highlighted as the stable baseline.
- MTU test diagram with a veth MTU lowered, a large UDP packet sent, and ICMP fragmentation needed captured in the run directory.

> [!example] Hands-On Lab Challenge
> mkdir -p lab-mtu/run-001 && cat > lab-mtu/topology.yaml <<'YAML'
topology:
  nodes:
    r1: {kind: linux}
    r2: {kind: linux}
  links:
    - endpoints: [r1:eth1, r2:eth1]
YAML
python lab-mtu/runner.py --topology lab-mtu/topology.yaml --run-dir lab-mtu/run-001 --test mtu --mtu 1000 --udp-size 1500 && containerlab destroy --topology lab-mtu/topology.yaml

---