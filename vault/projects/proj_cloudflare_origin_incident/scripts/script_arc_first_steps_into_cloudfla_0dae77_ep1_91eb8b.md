---
ai_metadata:
  duration_ms: 32997
  fallback_occurred: false
  fallback_reason: null
  model: qwen3.8-27b
  provider: openai_compatible
arc_id: arc_first_steps_into_cloudfla_0dae77
created_at: '2026-09-08T15:39:12.919691+00:00'
episode_id: arc_first_steps_into_cloudfla_0dae77_ep1
estimated_speaking_minutes: 5.8
hook_text: Your origin is dead, but Cloudflare is serving stale 200 OKs. On-call sees
  green, users see success, and the real outage hides behind the orange cloud. Stop
  guessing. Fix origin visibility now.
key_facts_referenced: []
script_id: script_arc_first_steps_into_cloudfla_0dae77_ep1_91eb8b
sections:
- estimated_wpm: 120
  section_type: hook
  spoken_text: Your origin is dead. The database is down, the API is returning 502s,
    and your on-call engineer is staring at a green Cloudflare dashboard. Stale 200
    OK responses are being served from the edge, so users see success while your backend
    is on fire. Stop trusting the orange cloud. Fix origin visibility now. This episode
    gives you the escape hatch.
  target_duration_seconds: 30
  title: The Green Dashboard Lie
  visual_cue: '[SLIDE: Title: First Steps Into Cloudflare. Visual: green dashboard
    with red origin status hidden behind an orange cloud icon.]'
- estimated_wpm: 141
  section_type: problem_breakdown
  spoken_text: Here is why conventional advice fails. Teams point DNS at Cloudflare,
    enable proxy mode, and assume the dashboard is the source of truth. It is not.
    Cloudflare is a reverse proxy and cache. If a cached response exists, the edge
    can return it even when the origin is unreachable. For static assets, that is
    often acceptable. For dynamic APIs, it is a lie. A 200 OK from the edge does not
    prove your backend is healthy. It proves the edge has something to send. If you
    do not monitor the origin directly, you will discover failures from customer complaints,
    not alerts. The green dashboard becomes a post-mortem exhibit. The failure mode
    is not exotic. It is the default behavior of a proxy without out-of-band origin
    health checks. You also inherit cache key traps. If query strings, cookies, or
    auth headers are not normalized, the edge may serve the wrong response to the
    wrong user. That is not a configuration detail. That is a data leak.
  target_duration_seconds: 70
  title: Why Proxy Mode Hides Outages
  visual_cue: '[DIAGRAM: Split-screen: left shows origin down with 502s, right shows
    Cloudflare edge returning cached 200 OK. Bottom strip: cache key fields including
    path, query, cookie, auth header.]'
- estimated_wpm: 141
  section_type: deep_dive
  spoken_text: 'Let''s break the system into three layers. Layer one is DNS. Cloudflare
    can resolve your domain without proxying traffic. That gives you DNS visibility,
    but no edge caching and no origin masking. Layer two is static CDN. You proxy
    only immutable or versioned assets, like JavaScript bundles, images, and CSS.
    The cache key is simple: path, version, and content hash. You can set long TTLs
    and cache rules that ignore user-specific headers. Layer three is dynamic proxy.
    You put APIs behind the orange cloud. This is where the risk spikes. The edge
    may cache responses, retry origins, and serve stale content during failures. For
    dynamic APIs, you need explicit cache rules: no-store for authenticated endpoints,
    cache key only on safe query parameters, and short TTLs where caching is intentional.
    Now the critical control: out-of-band synthetic origin health checks. Do not rely
    on Cloudflare''s dashboard. Build a prober that hits the origin IP directly, bypassing
    the proxy. It should run from multiple vantage points, outside your primary network
    path. It should check a lightweight endpoint, like /healthz, with a strict timeout,
    and verify TLS, status code, and response body. Alert when two consecutive probes
    fail, not when the dashboard turns yellow. The prober must use the origin IP or
    a private hostname that does not resolve through Cloudflare. If you use the public
    domain, you are testing the proxy, not the origin. The safe adoption path is three
    phases. Phase one: DNS only. Validate records, TTLs, and failover behavior. Phase
    two: static CDN. Ship versioned assets, verify cache headers, and confirm cache
    keys do not include user identity. Phase three: dynamic proxy. Enable proxying
    only after origin monitoring, cache rules, and rollback paths are in place. Rollback
    means you can switch DNS to origin, disable proxying, or drain traffic without
    losing observability. If you cannot prove the origin is down from outside the
    proxy, you are not ready. Also watch MTU traps. If your origin path uses tunnels,
    VPNs, or fragmented packets, a health check that passes on small payloads can
    fail under real request sizes. Probe with a realistic body size, and test TCP,
    TLS, and HTTP separately. A green ping is not a green API.'
  target_duration_seconds: 155
  title: DNS, Static CDN, and Out-of-Band Origin Probing
  visual_cue: '[CODE: curl --resolve api.example.com:443:203.0.113.10 https://api.example.com/healthz
    --max-time 2 -s -o /dev/null -w ''%{http_code} %{time_total}\n'']'
- estimated_wpm: 133
  section_type: pitfalls
  spoken_text: The first pitfall is treating Cloudflare as an origin monitor. It is
    not. The second is caching authenticated responses because the cache key ignores
    the Authorization header. That is a data leak. The third is using the public domain
    for synthetic checks. You are testing the proxy, not the origin. The fourth is
    assuming DNS-only mode is safe for dynamic traffic. It reduces masking, but it
    does not fix backend failures. The fifth is forgetting rollback. If your only
    escape is waiting for DNS TTLs to expire, your incident response is too slow.
    Keep a short TTL for origin failover, or use a load balancer with health checks.
    The final trap is celebrating a green dashboard while your users are receiving
    stale data. Green means the edge is responding. It does not mean the system is
    healthy. Make the alert page you, not the dashboard.
  target_duration_seconds: 65
  title: Failure Modes That Burn Teams
  visual_cue: '[SLIDE: Pitfall checklist: proxy as monitor, auth cache leak, public-domain
    probing, DNS-only false safety, slow TTL rollback, green dashboard bias.]'
- estimated_wpm: 130
  section_type: action_call
  spoken_text: 'Before you proxy another API, do three things. First, stand up an
    out-of-band prober that hits the origin IP directly. Second, write cache rules
    that exclude authenticated endpoints and user-specific headers. Third, rehearse
    rollback: switch DNS, disable proxying, and verify users see real origin responses.
    If you cannot prove the origin is down while the edge stays green, you are not
    ready for the orange cloud. Ship the safe path: DNS, static CDN, then dynamic
    proxy.'
  target_duration_seconds: 35
  title: Safe Adoption Path
  visual_cue: '[DIAGRAM: 3-phase adoption flow: DNS-only -> static CDN -> dynamic
    proxy, with origin prober arrow bypassing Cloudflare to origin IP.]'
target_duration_minutes: 6
title: 'First Steps Into Cloudflare: DNS, CDN, and Not Hiding Origin Failures'
total_word_count: 812
---

# First Steps Into Cloudflare: DNS, CDN, and Not Hiding Origin Failures

> [!abstract] Teleprompter Overview
> - **Episode ID**: `arc_first_steps_into_cloudfla_0dae77_ep1` | **Arc ID**: `arc_first_steps_into_cloudfla_0dae77`
> - **Pacing**: ~6 mins (812 words @ 140-145 WPM)
> - **Estimated Speaking Time**: 5.6 minutes
> - **Grounded Facts**: General

> [!danger] 15-Second Opening Hook (Agitate the Pain)
> Your origin is dead, but Cloudflare is serving stale 200 OKs. On-call sees green, users see success, and the real outage hides behind the orange cloud. Stop guessing. Fix origin visibility now.

---

## [00:00] Section 1: The Green Dashboard Lie
- **Type**: `hook` | **Target**: 30s | **Words**: 60

> [!tip] Visual Anchor
> [SLIDE: Title: First Steps Into Cloudflare. Visual: green dashboard with red origin status hidden behind an orange cloud icon.]

Your origin is dead. The database is down, the API is returning 502s, and your on-call engineer is staring at a green Cloudflare dashboard. Stale 200 OK responses are being served from the edge, so users see success while your backend is on fire. Stop trusting the orange cloud. Fix origin visibility now. This episode gives you the escape hatch.

---

## [00:30] Section 2: Why Proxy Mode Hides Outages
- **Type**: `problem_breakdown` | **Target**: 70s | **Words**: 165

> [!tip] Visual Anchor
> [DIAGRAM: Split-screen: left shows origin down with 502s, right shows Cloudflare edge returning cached 200 OK. Bottom strip: cache key fields including path, query, cookie, auth header.]

Here is why conventional advice fails. Teams point DNS at Cloudflare, enable proxy mode, and assume the dashboard is the source of truth. It is not. Cloudflare is a reverse proxy and cache. If a cached response exists, the edge can return it even when the origin is unreachable. For static assets, that is often acceptable. For dynamic APIs, it is a lie. A 200 OK from the edge does not prove your backend is healthy. It proves the edge has something to send. If you do not monitor the origin directly, you will discover failures from customer complaints, not alerts. The green dashboard becomes a post-mortem exhibit. The failure mode is not exotic. It is the default behavior of a proxy without out-of-band origin health checks. You also inherit cache key traps. If query strings, cookies, or auth headers are not normalized, the edge may serve the wrong response to the wrong user. That is not a configuration detail. That is a data leak.

---

## [01:40] Section 3: DNS, Static CDN, and Out-of-Band Origin Probing
- **Type**: `deep_dive` | **Target**: 155s | **Words**: 366

> [!tip] Visual Anchor
> [CODE: curl --resolve api.example.com:443:203.0.113.10 https://api.example.com/healthz --max-time 2 -s -o /dev/null -w '%{http_code} %{time_total}\n']

Let's break the system into three layers. Layer one is DNS. Cloudflare can resolve your domain without proxying traffic. That gives you DNS visibility, but no edge caching and no origin masking. Layer two is static CDN. You proxy only immutable or versioned assets, like JavaScript bundles, images, and CSS. The cache key is simple: path, version, and content hash. You can set long TTLs and cache rules that ignore user-specific headers. Layer three is dynamic proxy. You put APIs behind the orange cloud. This is where the risk spikes. The edge may cache responses, retry origins, and serve stale content during failures. For dynamic APIs, you need explicit cache rules: no-store for authenticated endpoints, cache key only on safe query parameters, and short TTLs where caching is intentional. Now the critical control: out-of-band synthetic origin health checks. Do not rely on Cloudflare's dashboard. Build a prober that hits the origin IP directly, bypassing the proxy. It should run from multiple vantage points, outside your primary network path. It should check a lightweight endpoint, like /healthz, with a strict timeout, and verify TLS, status code, and response body. Alert when two consecutive probes fail, not when the dashboard turns yellow. The prober must use the origin IP or a private hostname that does not resolve through Cloudflare. If you use the public domain, you are testing the proxy, not the origin. The safe adoption path is three phases. Phase one: DNS only. Validate records, TTLs, and failover behavior. Phase two: static CDN. Ship versioned assets, verify cache headers, and confirm cache keys do not include user identity. Phase three: dynamic proxy. Enable proxying only after origin monitoring, cache rules, and rollback paths are in place. Rollback means you can switch DNS to origin, disable proxying, or drain traffic without losing observability. If you cannot prove the origin is down from outside the proxy, you are not ready. Also watch MTU traps. If your origin path uses tunnels, VPNs, or fragmented packets, a health check that passes on small payloads can fail under real request sizes. Probe with a realistic body size, and test TCP, TLS, and HTTP separately. A green ping is not a green API.

---

## [04:15] Section 4: Failure Modes That Burn Teams
- **Type**: `pitfalls` | **Target**: 65s | **Words**: 145

> [!tip] Visual Anchor
> [SLIDE: Pitfall checklist: proxy as monitor, auth cache leak, public-domain probing, DNS-only false safety, slow TTL rollback, green dashboard bias.]

The first pitfall is treating Cloudflare as an origin monitor. It is not. The second is caching authenticated responses because the cache key ignores the Authorization header. That is a data leak. The third is using the public domain for synthetic checks. You are testing the proxy, not the origin. The fourth is assuming DNS-only mode is safe for dynamic traffic. It reduces masking, but it does not fix backend failures. The fifth is forgetting rollback. If your only escape is waiting for DNS TTLs to expire, your incident response is too slow. Keep a short TTL for origin failover, or use a load balancer with health checks. The final trap is celebrating a green dashboard while your users are receiving stale data. Green means the edge is responding. It does not mean the system is healthy. Make the alert page you, not the dashboard.

---

## [05:20] Section 5: Safe Adoption Path
- **Type**: `action_call` | **Target**: 35s | **Words**: 76

> [!tip] Visual Anchor
> [DIAGRAM: 3-phase adoption flow: DNS-only -> static CDN -> dynamic proxy, with origin prober arrow bypassing Cloudflare to origin IP.]

Before you proxy another API, do three things. First, stand up an out-of-band prober that hits the origin IP directly. Second, write cache rules that exclude authenticated endpoints and user-specific headers. Third, rehearse rollback: switch DNS, disable proxying, and verify users see real origin responses. If you cannot prove the origin is down while the edge stays green, you are not ready for the orange cloud. Ship the safe path: DNS, static CDN, then dynamic proxy.

---