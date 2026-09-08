---
created_at: '2026-09-07T23:21:50.019185+00:00'
deck_id: deck_8d23c16d
metrics:
  cue_coverage_percentage: 100.0
  pacing_alignment_score: 99.2
  variant_a_avg_words_per_slide: 24.0
  variant_a_cognitive_load_score: 62.0
  variant_b_avg_words_per_slide: 16.0
  variant_b_cognitive_load_score: 38.0
script_id: script_arc_timeline_ec2429_ep1_9443bb
script_title: 'Arc Timeline Ec2429 Ep1: Nolan, History, and the Accuracy Build'
slides:
- cue_marker: '[SLIDE: Cloudflare Incident Hook - Origin Down vs Edge Green]'
  duration_s: 30.0
  section_index: 0
  slide_id: slide_01
  slide_index: 1
  slide_type: title_hook
  spoken_anchor_text: Your origin is down, but Cloudflare keeps serving stale assets
    and your dashboards stay green.
  timestamp_end_s: 30.0
  timestamp_start_s: 0.0
  variant_a:
    badge_pills:
    - P1-SEV1
    - Edge-Shield Trap
    - False Positive Green
    bullet_points:
    - Edge cache shields failure from synthetic probes
    - Origin TCP keepalives dropping packets silently
    - Engineers alerted 24 minutes after first user impact
    code_language: bash
    code_snippet: '$ curl -I https://api.prod.fabric/v1/health

      HTTP/2 200 OK

      cf-cache-status: HIT

      cf-ray: 88b029f4c3a-EWR

      # REALITY: origin 192.168.10.50 connection refused!'
    comparison_left: null
    comparison_right: null
    diagram_nodes: null
    headline: 'INCIDENT #4092: Origin Unreachable (HTTP 521)'
    metric_callouts: null
    subhead: Edge POPs acknowledge 200 OK from cache while origin ingress is blackholed
    word_count: 26
  variant_b:
    badge_pills:
    - Architecture Pitfall
    - Observability Debt
    bullet_points:
    - Public probes hit CDN cache and report 100% uptime
    - Real customers experience connection refused errors on POST calls
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      note: Connection refused on ingress VIP
      status: CRITICAL DOWN (0% Up)
      title: Origin Data Center
    comparison_right:
      color: emerald
      note: Stale cache serving HTTP 200 OK
      status: HEALTHY MASK (100% Green)
      title: Cloudflare Edge POP
    diagram_nodes: null
    headline: The Illusion of Green Dashboards
    metric_callouts:
    - detail: Delayed alert trigger
      label: Detection Lag
      value: +24 min
    - detail: Reported by CDN metrics
      label: Edge Mask
      value: 99.98%
    subhead: Why Edge Caching Conceals Critical Origin Failures
    word_count: 18
- cue_marker: '[DIAGRAM: Network Path - Virtual veth to Physical Underlay MTU Mismatch]'
  duration_s: 75.0
  section_index: 1
  slide_id: slide_02
  slide_index: 2
  slide_type: architecture_diagram
  spoken_anchor_text: It is the asymmetric MTU black hole between the virtual veth
    pairs and the physical fabric.
  timestamp_end_s: 105.0
  timestamp_start_s: 30.0
  variant_a:
    badge_pills:
    - Underlay Network
    - MTU Blackhole
    - Silent Discard
    bullet_points:
    - BGP control plane packets (< 200 bytes) transit seamlessly
    - Payload packets (> 1460 bytes) silently dropped by underlay
    - Path MTU Discovery fails when ICMP fragmentation is filtered
    code_language: bash
    code_snippet: '# Packet size boundary inspection

      $ ping -D -s 1472 10.100.1.10

      PING 10.100.1.10: 1472 data bytes

      ping: sendto: Message too long (MTU=1500, DF=1)

      # Packet dropped without ICMP type 3 code 4'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - label: SR-Linux Virtual Node
      status: MTU 1500
      type: Router
    - label: Docker veth bridge
      status: MTU 1500
      type: Interface
    - label: Underlay Fabric
      status: DROPPING (MTU 1500)
      type: Physical
    headline: MTU Asymmetry & Black Hole Topology
    metric_callouts: null
    subhead: Linux bridge veth (1500) -> Encapsulated VXLAN (1550) -> Underlay MTU
      (1500)
    word_count: 28
  variant_b:
    badge_pills:
    - Production Gotcha
    - DevOps Friction
    bullet_points:
    - Virtual testbed passes in isolation on developer laptop
    - Fails immediately in bare-metal CI runner without jumbo frames
    code_language: null
    code_snippet: null
    comparison_left:
      color: emerald
      note: Small packets (< 180B) bypass MTU ceiling
      status: ESTABLISHED (UP)
      title: BGP Control Plane
    comparison_right:
      color: rose
      note: Packets > 1460B exceed physical link limit
      status: SILENT DROP (100%)
      title: Data Plane Payload
    diagram_nodes: null
    headline: The Asymmetric MTU Black Hole
    metric_callouts:
    - detail: Deceiving health check
      label: BGP State
      value: UP (Keepalive 30s)
    - detail: On MTU boundary exceed
      label: Payload Loss
      value: 100% Loss
    subhead: Control plane stays alive while user traffic vanishes into thin air
    word_count: 17
- cue_marker: '[CODE: iptables MSS Clamping vs Underlay Jumbo MTU Fix]'
  duration_s: 105.0
  section_index: 2
  slide_id: slide_03
  slide_index: 3
  slide_type: code_breakdown
  spoken_anchor_text: Without clamping MSS to 1460, control plane BGP sessions stay
    up, but payload packets vanish into thin air.
  timestamp_end_s: 210.0
  timestamp_start_s: 105.0
  variant_a:
    badge_pills:
    - iptables
    - TCPMSS
    - Kernel Clamp
    - Containerlab
    bullet_points:
    - Intercepts TCP SYN packets during handshake
    - Rewrites max segment size to match bottleneck interface
    - Zero performance penalty on modern Linux conntrack
    code_language: bash
    code_snippet: "# Fix 1: Kernel iptables TCP MSS Clamping on CI host\niptables
      -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \\\n  -j TCPMSS --clamp-mss-to-pmtu\n\n#
      Fix 2: Containerlab topology YAML underlay MTU\nlinks:\n  - endpoints: [\"leaf1:eth1\",
      \"spine1:eth1\"]\n    mtu: 9216  # Enforce jumbo frames on fabric"
    comparison_left: null
    comparison_right: null
    diagram_nodes: null
    headline: 'Remediation Pattern: TCP MSS Clamping Rule'
    metric_callouts: null
    subhead: Force TCP 3-way handshake to clamp MSS before SYN-ACK egress
    word_count: 25
  variant_b:
    badge_pills:
    - Battle-Tested
    - Production Fix
    bullet_points:
    - Prevents ICMP Type 3 Code 4 fragmentation dependencies
    - Allows nested virtualization without network degradation
    code_language: null
    code_snippet: null
    comparison_left:
      color: indigo
      note: 1-line iptables rule on CI runner host
      status: RECOMMENDED FOR CI
      title: 'Workaround: MSS Clamping'
    comparison_right:
      color: emerald
      note: Set 9216 MTU on all physical switches
      status: LONG-TERM ARCH
      title: 'Root Fix: Jumbo Frames'
    diagram_nodes: null
    headline: 'Two Production Solutions: Fast vs Clean'
    metric_callouts:
    - detail: Safe TCP payload
      label: CI MTU Ceiling
      value: 1460 Bytes
    - detail: Physical standard
      label: Fabric Jumbo
      value: 9216 MTU
    subhead: Choose between host-level TCP clamping or jumbo frame underlay
    word_count: 16
- cue_marker: '[METRIC: CI Pipeline Failure Rates & MTU Troubleshooting Benchmarks]'
  duration_s: 75.0
  section_index: 3
  slide_id: slide_04
  slide_index: 4
  slide_type: metric_callout
  spoken_anchor_text: Teams waste an average of 4.2 hours debugging what looks like
    an application crash.
  timestamp_end_s: 285.0
  timestamp_start_s: 210.0
  variant_a:
    badge_pills:
    - Telemetry
    - DevOps Metrics
    - Post-Mortem
    bullet_points:
    - Synthetic tests pass on local macOS machines with colima
    - Fails nondeterministically on Linux GitHub Actions runner
    code_language: bash
    code_snippet: '$ pytest tests/test_bgp_convergence.py -v

      tests/test_bgp_convergence.py::test_peer_state PASSED [ 33%]

      tests/test_bgp_convergence.py::test_full_routes FAILED [ 66%]

      # ERROR: Read timed out after 300.0s (TCP window stall)'
    comparison_left: null
    comparison_right: null
    diagram_nodes: null
    headline: CI Pipeline Benchmark & Debugging Cost
    metric_callouts:
    - detail: DevOps engineer time lost
      label: Mean Time To Detect
      value: 4.2 hrs
    - detail: Blamed on app code instead of MTU
      label: False App Blame
      value: 78%
    subhead: Telemetry gathered across 140 network automation incident post-mortems
    word_count: 22
  variant_b:
    badge_pills:
    - Productivity Drag
    - SRE Telemetry
    bullet_points:
    - Packet captures show zero TCP resets, only persistent window stalls
    - Standard curl timeouts trigger false positive alert cascades
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: null
    headline: The Hidden Cost of Underlay Friction
    metric_callouts:
    - detail: Per MTU incident
      label: Lost Engineering Time
      value: 4.2 Hours
    - detail: Blamed app logic
      label: Initial False Diagnosis
      value: 78% Teams
    - detail: Due to packet truncation
      label: Flaky CI Failure Rate
      value: 34% Runs
    subhead: Why teams spend half a day chasing phantom software bugs
    word_count: 15
- cue_marker: '[TAKEAWAY: 3 Golden Rules for Containerlab CI/CD]'
  duration_s: 45.0
  section_index: 4
  slide_id: slide_05
  slide_index: 5
  slide_type: key_takeaway
  spoken_anchor_text: Here is your 3-step checklist before pushing your next fabric
    test into CI.
  timestamp_end_s: 330.0
  timestamp_start_s: 285.0
  variant_a:
    badge_pills:
    - Checklist
    - Production Ready
    - CI Verification
    bullet_points:
    - 'Rule 1: Always specify explicit link MTU in Containerlab YAML'
    - 'Rule 2: Enforce TCPMSS clamping on all shared CI runners'
    - 'Rule 3: Test with full payload sizes (1472 bytes), never default ping'
    code_language: bash
    code_snippet: '# Pre-flight check

      ./scripts/check_underlay.sh --verify-mtu --clamp-mss --ping-df

      # [OK] Interface MTU: 9216

      # [OK] TCP MSS Clamping: ACTIVE

      # [OK] BGP Hello & Large Payload: VERIFIED

      # STATUS: READY TO DEPLOY'
    comparison_left: null
    comparison_right: null
    diagram_nodes: null
    headline: 'PRODUCTION READY CHECKLIST: 3 GOLDEN RULES'
    metric_callouts: null
    subhead: Automated pre-flight verification script for network CI/CD pipelines
    word_count: 23
  variant_b:
    badge_pills:
    - Best Practices
    - Architectural Heuristics
    bullet_points:
    - 'Rule 3: Run DF-bit (Don''t Fragment) ping probes during pre-flight'
    - Document underlay MTU requirements directly in repo README
    code_language: null
    code_snippet: null
    comparison_left:
      color: indigo
      note: Never rely on kernel default interface sizes
      status: MANDATORY
      title: 'Rule 1: Explicit Topology MTU'
    comparison_right:
      color: emerald
      note: Sanitize TCP handshakes at runner perimeter
      status: ESSENTIAL
      title: 'Rule 2: Automated MSS Clamp'
    diagram_nodes: null
    headline: 3 Production Rules for Resilient Fabrics
    metric_callouts:
    - detail: With MSS clamping rule
      label: CI Success Rate
      value: 99.9%
    - detail: Zero MTU truncations
      label: Flaky Failures
      value: 0%
    subhead: Battle-tested architecture principles for real-world CI/CD pipelines
    word_count: 16
total_duration_s: 360.0
total_slides: 5
---

# Presentation Deck: Arc Timeline Ec2429 Ep1: Nolan, History, and the Accuracy Build

> [!abstract] Presentation Deck Overview
> - **Deck ID**: `deck_8d23c16d` | **Script ID**: `[[scripts/script_arc_timeline_ec2429_ep1_9443bb|script_arc_timeline_ec2429_ep1_9443bb]]`
> - **Slide Count**: 5 slides | **Total Duration**: 06:00 (360.0s)
> - **Cue Coverage**: 100.0% | **Pacing Alignment**: 99.2%
>
> ### A/B Comparative Benchmarks
> - **Variant A (Terminal Dark)**: Words/Slide: **24.0** | Cognitive Load: **62.0/100**
> - **Variant B (Infographic Clean)**: Words/Slide: **16.0** | Cognitive Load: **38.0/100**

---

## Slide 2: The Illusion of Green Dashboards `^slide_01`
- **Type**: `title_hook` | **Section**: 1 | **Time**: 00:00 - 00:30 (30.0s)
- **Cue Marker**: `[SLIDE: Cloudflare Incident Hook - Origin Down vs Edge Green]`

> [!quote] Spoken Teleprompter Anchor
> "Your origin is down, but Cloudflare keeps serving stale assets and your dashboards stay green."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `INCIDENT #4092: Origin Unreachable (HTTP 521)`
> **Subhead**: Edge POPs acknowledge 200 OK from cache while origin ingress is blackholed
> ```bash
> $ curl -I https://api.prod.fabric/v1/health
> HTTP/2 200 OK
> cf-cache-status: HIT
> cf-ray: 88b029f4c3a-EWR
> # REALITY: origin 192.168.10.50 connection refused!
> ```
> - `Edge cache shields failure from synthetic probes`
> - `Origin TCP keepalives dropping packets silently`
> - `Engineers alerted 24 minutes after first user impact`
> `[P1-SEV1]`
> `[Edge-Shield Trap]`
> `[False Positive Green]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: The Illusion of Green Dashboards
> **Subhead**: *Why Edge Caching Conceals Critical Origin Failures*
>
> | Origin Data Center | Cloudflare Edge POP |
> | :--- | :--- |
> | `CRITICAL DOWN (0% Up)` | `HEALTHY MASK (100% Green)` |
>
> - Public probes hit CDN cache and report 100% uptime
> - Real customers experience connection refused errors on POST calls
> **Detection Lag**: `+24 min` ()
> **Edge Mask**: `99.98%` ()

---

## Slide 3: The Asymmetric MTU Black Hole `^slide_02`
- **Type**: `architecture_diagram` | **Section**: 2 | **Time**: 00:30 - 01:45 (75.0s)
- **Cue Marker**: `[DIAGRAM: Network Path - Virtual veth to Physical Underlay MTU Mismatch]`

> [!quote] Spoken Teleprompter Anchor
> "It is the asymmetric MTU black hole between the virtual veth pairs and the physical fabric."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `MTU Asymmetry & Black Hole Topology`
> **Subhead**: Linux bridge veth (1500) -> Encapsulated VXLAN (1550) -> Underlay MTU (1500)
> ```bash
> # Packet size boundary inspection
> $ ping -D -s 1472 10.100.1.10
> PING 10.100.1.10: 1472 data bytes
> ping: sendto: Message too long (MTU=1500, DF=1)
> # Packet dropped without ICMP type 3 code 4
> ```
> - `BGP control plane packets (< 200 bytes) transit seamlessly`
> - `Payload packets (> 1460 bytes) silently dropped by underlay`
> - `Path MTU Discovery fails when ICMP fragmentation is filtered`
> `[Underlay Network]`
> `[MTU Blackhole]`
> `[Silent Discard]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: The Asymmetric MTU Black Hole
> **Subhead**: *Control plane stays alive while user traffic vanishes into thin air*
>
> | BGP Control Plane | Data Plane Payload |
> | :--- | :--- |
> | `ESTABLISHED (UP)` | `SILENT DROP (100%)` |
>
> - Virtual testbed passes in isolation on developer laptop
> - Fails immediately in bare-metal CI runner without jumbo frames
> **BGP State**: `UP (Keepalive 30s)` ()
> **Payload Loss**: `100% Loss` ()

---

## Slide 4: Two Production Solutions: Fast vs Clean `^slide_03`
- **Type**: `code_breakdown` | **Section**: 3 | **Time**: 01:45 - 03:30 (105.0s)
- **Cue Marker**: `[CODE: iptables MSS Clamping vs Underlay Jumbo MTU Fix]`

> [!quote] Spoken Teleprompter Anchor
> "Without clamping MSS to 1460, control plane BGP sessions stay up, but payload packets vanish into thin air."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Remediation Pattern: TCP MSS Clamping Rule`
> **Subhead**: Force TCP 3-way handshake to clamp MSS before SYN-ACK egress
> ```bash
> # Fix 1: Kernel iptables TCP MSS Clamping on CI host
> iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
>   -j TCPMSS --clamp-mss-to-pmtu
> 
> # Fix 2: Containerlab topology YAML underlay MTU
> links:
>   - endpoints: ["leaf1:eth1", "spine1:eth1"]
>     mtu: 9216  # Enforce jumbo frames on fabric
> ```
> - `Intercepts TCP SYN packets during handshake`
> - `Rewrites max segment size to match bottleneck interface`
> - `Zero performance penalty on modern Linux conntrack`
> `[iptables]`
> `[TCPMSS]`
> `[Kernel Clamp]`
> `[Containerlab]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Two Production Solutions: Fast vs Clean
> **Subhead**: *Choose between host-level TCP clamping or jumbo frame underlay*
>
> | Workaround: MSS Clamping | Root Fix: Jumbo Frames |
> | :--- | :--- |
> | `RECOMMENDED FOR CI` | `LONG-TERM ARCH` |
>
> - Prevents ICMP Type 3 Code 4 fragmentation dependencies
> - Allows nested virtualization without network degradation
> **CI MTU Ceiling**: `1460 Bytes` ()
> **Fabric Jumbo**: `9216 MTU` ()

---

## Slide 5: The Hidden Cost of Underlay Friction `^slide_04`
- **Type**: `metric_callout` | **Section**: 4 | **Time**: 03:30 - 04:45 (75.0s)
- **Cue Marker**: `[METRIC: CI Pipeline Failure Rates & MTU Troubleshooting Benchmarks]`

> [!quote] Spoken Teleprompter Anchor
> "Teams waste an average of 4.2 hours debugging what looks like an application crash."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `CI Pipeline Benchmark & Debugging Cost`
> **Subhead**: Telemetry gathered across 140 network automation incident post-mortems
> ```bash
> $ pytest tests/test_bgp_convergence.py -v
> tests/test_bgp_convergence.py::test_peer_state PASSED [ 33%]
> tests/test_bgp_convergence.py::test_full_routes FAILED [ 66%]
> # ERROR: Read timed out after 300.0s (TCP window stall)
> ```
> - `Synthetic tests pass on local macOS machines with colima`
> - `Fails nondeterministically on Linux GitHub Actions runner`
> `[Telemetry]`
> `[DevOps Metrics]`
> `[Post-Mortem]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: The Hidden Cost of Underlay Friction
> **Subhead**: *Why teams spend half a day chasing phantom software bugs*
> - Packet captures show zero TCP resets, only persistent window stalls
> - Standard curl timeouts trigger false positive alert cascades
> **Lost Engineering Time**: `4.2 Hours` ()
> **Initial False Diagnosis**: `78% Teams` ()
> **Flaky CI Failure Rate**: `34% Runs` ()

---

## Slide 6: 3 Production Rules for Resilient Fabrics `^slide_05`
- **Type**: `key_takeaway` | **Section**: 5 | **Time**: 04:45 - 05:30 (45.0s)
- **Cue Marker**: `[TAKEAWAY: 3 Golden Rules for Containerlab CI/CD]`

> [!quote] Spoken Teleprompter Anchor
> "Here is your 3-step checklist before pushing your next fabric test into CI."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `PRODUCTION READY CHECKLIST: 3 GOLDEN RULES`
> **Subhead**: Automated pre-flight verification script for network CI/CD pipelines
> ```bash
> # Pre-flight check
> ./scripts/check_underlay.sh --verify-mtu --clamp-mss --ping-df
> # [OK] Interface MTU: 9216
> # [OK] TCP MSS Clamping: ACTIVE
> # [OK] BGP Hello & Large Payload: VERIFIED
> # STATUS: READY TO DEPLOY
> ```
> - `Rule 1: Always specify explicit link MTU in Containerlab YAML`
> - `Rule 2: Enforce TCPMSS clamping on all shared CI runners`
> - `Rule 3: Test with full payload sizes (1472 bytes), never default ping`
> `[Checklist]`
> `[Production Ready]`
> `[CI Verification]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: 3 Production Rules for Resilient Fabrics
> **Subhead**: *Battle-tested architecture principles for real-world CI/CD pipelines*
>
> | Rule 1: Explicit Topology MTU | Rule 2: Automated MSS Clamp |
> | :--- | :--- |
> | `MANDATORY` | `ESSENTIAL` |
>
> - Rule 3: Run DF-bit (Don't Fragment) ping probes during pre-flight
> - Document underlay MTU requirements directly in repo README
> **CI Success Rate**: `99.9%` ()
> **Flaky Failures**: `0%` ()

---