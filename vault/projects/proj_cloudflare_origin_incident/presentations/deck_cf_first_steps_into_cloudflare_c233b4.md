---
ai_metadata:
  generator: deterministic_sample_builder
  provider: curated_grounded
created_at: '2026-09-08T14:13:48.625864+00:00'
deck_id: deck_cf_first_steps_into_cloudflare_c233b4
metrics:
  cue_coverage_percentage: 100.0
  pacing_alignment_score: 98.5
  variant_a_avg_words_per_slide: 64.8
  variant_a_cognitive_load_score: 100.0
  variant_b_avg_words_per_slide: 25.6
  variant_b_cognitive_load_score: 89.6
script_id: script_arc_first_steps_into_cloudfla_c233b4_ep1_c69864
script_title: 'First Steps Into Cloudflare: DNS, CDN, and Not Hiding Origin Failures'
slides:
- cue_marker: '[SLIDE: Origin down, edge green with red origin server, green Cloudflare
    dashboard, and stale asset icon]'
  duration_s: 30.0
  section_index: 0
  slide_id: slide_cf_01_hook
  slide_index: 0
  slide_type: title_hook
  spoken_anchor_text: Your origin is down, but Cloudflare keeps serving stale assets
    and your dashboards stay green.
  timestamp_end_s: 30.0
  timestamp_start_s: 0.0
  title: Cloudflare Incident Hook - Origin Down vs Edge Green
  variant_a:
    badge_pills:
    - SRE Incident
    - Edge Desync
    bullet_points:
    - 'Edge status: HEALTHY (cache hit 94.2%)'
    - 'Origin status: UNREACHABLE (refused)'
    - 'Anomaly: Green SLA hides 100% backend failure'
    code_language: bash
    code_snippet: '$ curl -Iv https://example.com/api/v1/checkout

      < HTTP/2 200

      < cf-cache-status: HIT

      # Origin: ECONNREFUSED (port 8080)'
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: 'FATAL: 502 Bad Gateway - Origin Unreachable'
    metric_callouts: []
    subhead: 'Cloudflare Edge [104.16.0.1]: Serving Cached 200 OK'
    word_count: 50
  variant_b:
    badge_pills:
    - Architecture Trap
    bullet_points:
    - Stale cache masks failure
    - Separate edge from origin
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      status: Offline 502
      title: Origin
    comparison_right:
      color: emerald
      status: Cached 200
      title: Edge
    diagram_nodes: []
    headline: The Green Dashboard Illusion
    metric_callouts: []
    subhead: Why Edge 200 Masks Backend Outages
    word_count: 26
- cue_marker: '[DIAGRAM: split-screen with direct origin request failing versus Cloudflare
    proxy serving cached asset while origin health check fails]'
  duration_s: 70.0
  section_index: 1
  slide_id: slide_cf_02_problem
  slide_index: 1
  slide_type: comparison_split
  spoken_anchor_text: Most teams jump into Cloudflare because they want speed, protection,
    and a cleaner DNS story. That is fine. The mistake is treating the orange cloud
    like a magic button.
  timestamp_end_s: 100.0
  timestamp_start_s: 30.0
  title: Direct Origin vs Edge Proxy Topology
  variant_a:
    badge_pills:
    - Anycast Routing
    - Proxy Topology
    bullet_points:
    - Anycast IP abstracts single origin IP
    - Direct curl bypasses edge WAF & cache
    - Runbooks relying on client ping fail silently
    code_language: bash
    code_snippet: '$ dig +trace example.com

      example.com. 300 IN A 172.67.142.12

      $ curl -H ''Host: example.com'' http://198.51.100.22/health

      curl: (7) Failed to connect to 198.51.100.22 port 80'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - name: Client
      role: Traffic
    - name: Anycast Edge
      role: Terminates TLS
    - name: Origin
      role: Backend Logic
    headline: 'Traffic Topology: Direct Origin vs Orange Cloud Proxy'
    metric_callouts: []
    subhead: Packet Flow Through Anycast Edge vs Origin BGP Route
    word_count: 65
  variant_b:
    badge_pills:
    - Direct vs Proxy
    bullet_points:
    - APIs fail silently behind cache
    - Ping creates false confidence
    code_language: null
    code_snippet: null
    comparison_left:
      color: rose
      status: Refused 500
      title: Direct Origin
    comparison_right:
      color: emerald
      status: Cached 200
      title: Edge Proxy
    diagram_nodes: []
    headline: Direct Origin vs Edge Proxy
    metric_callouts: []
    subhead: Observability Pipeline Divergence
    word_count: 28
- cue_marker: '[DIAGRAM: DNS record to orange cloud proxy to edge cache to origin
    server, with an independent health check path from monitoring to origin]'
  duration_s: 165.0
  section_index: 2
  slide_id: slide_cf_03_deepdive
  slide_index: 2
  slide_type: architecture_diagram
  spoken_anchor_text: 'Here is the adoption path that keeps you out of the post-mortem.
    Step one: DNS. Step two: CDN for public static assets. Step three: independent
    origin health checks.'
  timestamp_end_s: 265.0
  timestamp_start_s: 100.0
  title: 3-Stage Production Rollout Pipeline
  variant_a:
    badge_pills:
    - Production Pipeline
    - Zero Downtime
    bullet_points:
    - 'Step 1: Authoritative DNS without proxy manipulation'
    - 'Step 2: Static asset acceleration (immutable headers)'
    - 'Step 3: Dedicated synthetic probe directly to origin IP'
    code_language: python
    code_snippet: '# Stage 1: DNS Only (Grey Cloud)

      zone.add_record(name=''api'', type=''A'', content=''198.51.100.22'', proxied=False)

      # Stage 2: Cache Rules (Static Only)

      rule: (uri.path contains ''/static/*'') => cache_everything

      # Stage 3: Out-of-band Synthetics

      probe: curl -Iv https://direct-origin.internal:8443/healthz'
    comparison_left: null
    comparison_right: null
    diagram_nodes:
    - name: Cloudflare DNS
      role: Authoritative Anycast
    - name: Edge CDN Cache
      role: Static Assets
    - name: Origin Server
      role: Workloads
    - name: Synthetics
      role: Direct Prober
    headline: 3-Stage Production Rollout Pipeline
    metric_callouts: []
    subhead: Decoupled Architecture with Out-of-Band Synthetic Probing
    word_count: 70
  variant_b:
    badge_pills:
    - Best Practice
    bullet_points:
    - 1. DNS first (zero risk)
    - 2. Static assets only
    - 3. Independent origin alerts
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: Safe 3-Step Adoption
    metric_callouts:
    - label: DNS
      value: <10ms
    - label: CDN
      value: 85%
    subhead: Decouple DNS, Static CDN, Origin
    word_count: 27
- cue_marker: '[SLIDE: Five beginner traps: dashboard truth, proxy everything, DNS
    as production, no rollback, stale cache]'
  duration_s: 70.0
  section_index: 3
  slide_id: slide_cf_04_pitfalls
  slide_index: 3
  slide_type: metric_callout
  spoken_anchor_text: The first pitfall is trusting the Cloudflare dashboard as the
    only source of truth. The second pitfall is proxying everything on day one.
  timestamp_end_s: 335.0
  timestamp_start_s: 265.0
  title: 5 Beginner Operational Traps
  variant_a:
    badge_pills:
    - Post-Mortem
    - Anti-Patterns
    bullet_points:
    - 'Trap 1: Dashboard bias (Edge up != Backend up)'
    - 'Trap 2: Full-domain proxying without header isolation'
    - 'Trap 3: DNS changes treated as low-risk config'
    - 'Trap 4: Missing 1-click bypass / grey-cloud switch'
    - 'Trap 5: Stale cache serving corrupt or desynced bundles'
    code_language: bash
    code_snippet: '# Pitfall #2: Proxying Day 1

      CF-RAY: 81b29a... - 521 Origin Down

      # Pitfall #4: No Rollback Protocol

      $ wrangler rollback --version=v1.12.0 # Missing in staging!'
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: 'Incident Post-Mortem: 5 Catastrophic Pitfalls'
    metric_callouts: []
    subhead: Common Operational Hazards in Premature Edge Proxies
    word_count: 81
  variant_b:
    badge_pills:
    - Audit
    bullet_points:
    - Edge up != backend up
    - No API proxy day one
    - Automate rollback runbook
    code_language: null
    code_snippet: null
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: 5 Beginner Traps
    metric_callouts:
    - label: Risk
      value: Critical
    - label: Rollback
      value: <60s
    subhead: Preventing Edge Blind Outages
    word_count: 25
- cue_marker: '[CODE: curl -I https://origin.internal/healthz and curl -I https://example.com/healthz]'
  duration_s: 40.0
  section_index: 4
  slide_id: slide_cf_05_action
  slide_index: 4
  slide_type: code_breakdown
  spoken_anchor_text: Here is your next move. Put your domain in Cloudflare for DNS
    only. Verify every record. Then proxy static assets and set explicit cache rules.
  timestamp_end_s: 375.0
  timestamp_start_s: 335.0
  title: Dual Health Probing Verification
  variant_a:
    badge_pills:
    - Validation
    - Deploy Ready
    bullet_points:
    - Enforce non-cached bypass header on health checks
    - Validate SSL termination (Strict Full TLS only)
    - Document grey-cloud fallback in on-call pager
    code_language: bash
    code_snippet: '# Dual Health Verification Commands

      $ curl -IsS https://origin.internal/healthz | grep ''HTTP''

      HTTP/1.1 200 OK

      $ curl -IsS https://example.com/healthz | grep ''cf-cache''

      cf-cache-status: BYPASS'
    comparison_left: null
    comparison_right: null
    diagram_nodes: []
    headline: 'Production Validation: Dual Health Probing'
    metric_callouts: []
    subhead: Execute Verification Before Enabling Orange Cloud
    word_count: 58
  variant_b:
    badge_pills:
    - Action
    bullet_points:
    - Verify DNS grey-clouded first
    - Alert on non-cached origin
    code_language: null
    code_snippet: null
    comparison_left:
      color: sky
      status: curl origin/healthz
      title: Origin
    comparison_right:
      color: indigo
      status: curl edge/healthz
      title: Edge
    diagram_nodes: []
    headline: Deployment Checklist
    metric_callouts: []
    subhead: Two Direct Probes Before Proxy
    word_count: 22
total_duration_s: 375.0
total_slides: 5
---

# Presentation Deck: First Steps Into Cloudflare: DNS, CDN, and Not Hiding Origin Failures

> [!abstract] Presentation Deck Overview
> - **Deck ID**: `deck_cf_first_steps_into_cloudflare_c233b4` | **Script ID**: `[[scripts/script_arc_first_steps_into_cloudfla_c233b4_ep1_c69864|script_arc_first_steps_into_cloudfla_c233b4_ep1_c69864]]`
> - **Slide Count**: 5 slides | **Total Duration**: 06:15 (375.0s)
> - **Cue Coverage**: 100.0% | **Pacing Alignment**: 98.5%
>
> ### A/B Comparative Benchmarks
> - **Variant A (Terminal Dark)**: Words/Slide: **64.8** | Cognitive Load: **100.0/100**
> - **Variant B (Infographic Clean)**: Words/Slide: **25.6** | Cognitive Load: **89.6/100**

---

## Slide 1: The Green Dashboard Illusion `^slide_cf_01_hook`
- **Type**: `title_hook` | **Section**: 1 | **Time**: 00:00 - 00:30 (30.0s)
- **Cue Marker**: `[SLIDE: Origin down, edge green with red origin server, green Cloudflare dashboard, and stale asset icon]`

> [!quote] Spoken Teleprompter Anchor
> "Your origin is down, but Cloudflare keeps serving stale assets and your dashboards stay green."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `FATAL: 502 Bad Gateway - Origin Unreachable`
> **Subhead**: Cloudflare Edge [104.16.0.1]: Serving Cached 200 OK
> ```bash
> $ curl -Iv https://example.com/api/v1/checkout
> < HTTP/2 200
> < cf-cache-status: HIT
> # Origin: ECONNREFUSED (port 8080)
> ```
> - `Edge status: HEALTHY (cache hit 94.2%)`
> - `Origin status: UNREACHABLE (refused)`
> - `Anomaly: Green SLA hides 100% backend failure`
> `[SRE Incident]`
> `[Edge Desync]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: The Green Dashboard Illusion
> **Subhead**: *Why Edge 200 Masks Backend Outages*
>
> | Origin | Edge |
> | :--- | :--- |
> | `Offline 502` | `Cached 200` |
>
> - Stale cache masks failure
> - Separate edge from origin

---

## Slide 2: Direct Origin vs Edge Proxy `^slide_cf_02_problem`
- **Type**: `comparison_split` | **Section**: 2 | **Time**: 00:30 - 01:40 (70.0s)
- **Cue Marker**: `[DIAGRAM: split-screen with direct origin request failing versus Cloudflare proxy serving cached asset while origin health check fails]`

> [!quote] Spoken Teleprompter Anchor
> "Most teams jump into Cloudflare because they want speed, protection, and a cleaner DNS story. That is fine. The mistake is treating the orange cloud like a magic button."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Traffic Topology: Direct Origin vs Orange Cloud Proxy`
> **Subhead**: Packet Flow Through Anycast Edge vs Origin BGP Route
> ```bash
> $ dig +trace example.com
> example.com. 300 IN A 172.67.142.12
> $ curl -H 'Host: example.com' http://198.51.100.22/health
> curl: (7) Failed to connect to 198.51.100.22 port 80
> ```
> - `Anycast IP abstracts single origin IP`
> - `Direct curl bypasses edge WAF & cache`
> - `Runbooks relying on client ping fail silently`
> `[Anycast Routing]`
> `[Proxy Topology]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Direct Origin vs Edge Proxy
> **Subhead**: *Observability Pipeline Divergence*
>
> | Direct Origin | Edge Proxy |
> | :--- | :--- |
> | `Refused 500` | `Cached 200` |
>
> - APIs fail silently behind cache
> - Ping creates false confidence

---

## Slide 3: Safe 3-Step Adoption `^slide_cf_03_deepdive`
- **Type**: `architecture_diagram` | **Section**: 3 | **Time**: 01:40 - 04:25 (165.0s)
- **Cue Marker**: `[DIAGRAM: DNS record to orange cloud proxy to edge cache to origin server, with an independent health check path from monitoring to origin]`

> [!quote] Spoken Teleprompter Anchor
> "Here is the adoption path that keeps you out of the post-mortem. Step one: DNS. Step two: CDN for public static assets. Step three: independent origin health checks."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `3-Stage Production Rollout Pipeline`
> **Subhead**: Decoupled Architecture with Out-of-Band Synthetic Probing
> ```python
> # Stage 1: DNS Only (Grey Cloud)
> zone.add_record(name='api', type='A', content='198.51.100.22', proxied=False)
> # Stage 2: Cache Rules (Static Only)
> rule: (uri.path contains '/static/*') => cache_everything
> # Stage 3: Out-of-band Synthetics
> probe: curl -Iv https://direct-origin.internal:8443/healthz
> ```
> - `Step 1: Authoritative DNS without proxy manipulation`
> - `Step 2: Static asset acceleration (immutable headers)`
> - `Step 3: Dedicated synthetic probe directly to origin IP`
> `[Production Pipeline]`
> `[Zero Downtime]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Safe 3-Step Adoption
> **Subhead**: *Decouple DNS, Static CDN, Origin*
> - 1. DNS first (zero risk)
> - 2. Static assets only
> - 3. Independent origin alerts
> **DNS**: `<10ms` ()
> **CDN**: `85%` ()

---

## Slide 4: 5 Beginner Traps `^slide_cf_04_pitfalls`
- **Type**: `metric_callout` | **Section**: 4 | **Time**: 04:25 - 05:35 (70.0s)
- **Cue Marker**: `[SLIDE: Five beginner traps: dashboard truth, proxy everything, DNS as production, no rollback, stale cache]`

> [!quote] Spoken Teleprompter Anchor
> "The first pitfall is trusting the Cloudflare dashboard as the only source of truth. The second pitfall is proxying everything on day one."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Incident Post-Mortem: 5 Catastrophic Pitfalls`
> **Subhead**: Common Operational Hazards in Premature Edge Proxies
> ```bash
> # Pitfall #2: Proxying Day 1
> CF-RAY: 81b29a... - 521 Origin Down
> # Pitfall #4: No Rollback Protocol
> $ wrangler rollback --version=v1.12.0 # Missing in staging!
> ```
> - `Trap 1: Dashboard bias (Edge up != Backend up)`
> - `Trap 2: Full-domain proxying without header isolation`
> - `Trap 3: DNS changes treated as low-risk config`
> - `Trap 4: Missing 1-click bypass / grey-cloud switch`
> - `Trap 5: Stale cache serving corrupt or desynced bundles`
> `[Post-Mortem]`
> `[Anti-Patterns]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: 5 Beginner Traps
> **Subhead**: *Preventing Edge Blind Outages*
> - Edge up != backend up
> - No API proxy day one
> - Automate rollback runbook
> **Risk**: `Critical` ()
> **Rollback**: `<60s` ()

---

## Slide 5: Deployment Checklist `^slide_cf_05_action`
- **Type**: `code_breakdown` | **Section**: 5 | **Time**: 05:35 - 06:15 (40.0s)
- **Cue Marker**: `[CODE: curl -I https://origin.internal/healthz and curl -I https://example.com/healthz]`

> [!quote] Spoken Teleprompter Anchor
> "Here is your next move. Put your domain in Cloudflare for DNS only. Verify every record. Then proxy static assets and set explicit cache rules."

> [!example] Variant A: Terminal / Architecture Dark (SRE Console)
> **Headline**: `Production Validation: Dual Health Probing`
> **Subhead**: Execute Verification Before Enabling Orange Cloud
> ```bash
> # Dual Health Verification Commands
> $ curl -IsS https://origin.internal/healthz | grep 'HTTP'
> HTTP/1.1 200 OK
> $ curl -IsS https://example.com/healthz | grep 'cf-cache'
> cf-cache-status: BYPASS
> ```
> - `Enforce non-cached bypass header on health checks`
> - `Validate SSL termination (Strict Full TLS only)`
> - `Document grey-cloud fallback in on-call pager`
> `[Validation]`
> `[Deploy Ready]`

> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)
> **Headline**: Deployment Checklist
> **Subhead**: *Two Direct Probes Before Proxy*
>
> | Origin | Edge |
> | :--- | :--- |
> | `curl origin/healthz` | `curl edge/healthz` |
>
> - Verify DNS grey-clouded first
> - Alert on non-cached origin

---