# Dissensus.ai — Enhancement Plan (Jul 2026)

**Goal:** turn a strong static research-lab site into one that reads, to a grant reviewer, as a *serious, alive, fundable* research organisation — by adding motion, a credibility layer, and an explicit funding ask. **Not a rebuild.**

---

## 0. Assessment — what we keep vs. what we add

**Already strong (do NOT touch the identity):**
- Distinctive design language: near-black `#050505`, crimson `#DC143C`, monospace + display-serif hero, numbered sections (`01 · Programme`), the `dis·sen·sus` etymology block. Most labs would kill for this.
- Real content depth: 20+ papers, manifesto, charter, the ASCRI programme framing.
- Clean architecture: zero-dependency static HTML/CSS/JS, `papers.json` → build pipeline, Cloudflare Pages auto-deploy. Fast, no bloat, no attack surface.

**Missing for the grant goal:**
1. **Motion** — the whole site is static; nothing moves on scroll. (Your explicit ask.)
2. **A funding ask** — there is no "here's what we are, here's what funding unlocks, here's how to engage" page. This is the single biggest gap for grants.
3. **A credibility layer** — team credentials, track record, and traction signals are thin/scattered.

**Hard constraints we respect (from the repo's own CLAUDE.md):** no frameworks, no build tools beyond the existing Node script, static-only, `master` branch, Cloudflare Pages. All motion below is **vanilla JS + CSS, zero dependencies.**

---

## 1. Motion system — "things slide in on scroll" (all vanilla)

**a) Scroll-reveal engine (the core of your ask).**
One small vanilla module using the **Intersection Observer API**:
- Add `class="reveal" data-reveal="fade-up|slide-left|slide-right|scale-in"` to any element.
- ~40 lines of JS toggle `.is-visible` when the element enters the viewport; CSS handles the transition (opacity + transform, ~600ms, eased).
- **Staggered children**: lists/cards reveal in sequence (`transition-delay` by index) — the paper grid, the stat row, the programme cards cascade in.
- One-shot (reveal once, don't re-hide on scroll-up) — feels intentional, not gimmicky.

**b) Hero centerpiece — a live "friction network" canvas.**
A subtle animated node-and-edge network behind/beside the hero: agents (nodes) drift, edges tense and relax (the friction motif made literal). **This is on-thesis** — your whole lab is about multi-agent friction — and it's the thing a funder remembers 10 minutes later. Pure `<canvas>`, ~120 lines, ~60fps, crimson edges on black. Degrades to a static SVG if `prefers-reduced-motion`.

**c) Micro-interactions (polish that signals "professional"):**
- Nav link underline-sweep on hover; the crimson accent as a recurring "friction" motif.
- **Number count-ups** on the stat row (Publications → 20, etc.) when it scrolls into view.
- Card hover-lift (subtle `translateY` + border glow) on paper/programme cards.
- Thin scroll-progress bar (crimson) at the top.
- Section numbers (`01 ·`) + their rule line "draw in" on reveal.

**d) Accessibility, non-negotiable:** every animation is wrapped in `@media (prefers-reduced-motion: no-preference)`; with motion off or JS disabled, all content is fully present and readable. No layout shift, no content hidden behind JS.

**Footprint:** one `motion.js` (~5KB) + one CSS block. No libraries. Lighthouse stays green.

---

## 2. Functionality — ranked, needs your steer

### Tier A — credibility & the ask (build first; these move grant needle)
- **A "Fund / Partner" page** *(new — the biggest gap).* Explicit: what Dissensus is, the programme, what specific funding unlocks (compute, RA time, the CBDC/autonomous experiments, the PhD-adjacent work), and a clear contact/engagement path. This is the grant-conversion page the site currently lacks entirely.
- **Research/Publications hub upgrade.** You already build paper pages from `papers.json` — add client-side **filtering** (by programme / status / year) and **status badges** (Under Review @ X, Preprint). Makes the 20-paper body legible as a *portfolio*, not a list.
- **Credibility layer on About/Team.** Bios with credentials (MSc KCL, First-Class SOAS), the track record framed as evidence (20+ papers across N venues), collaborators/affiliates, the CAIF/Berggruen/Gov.AI signals.

### Tier B — traction signals (alive-ness)
- **Live metrics band**: paper count · venues · Zenodo download totals (their API) · the live ASRI index number.
- **ASRI as a hero-grade showcase**, not a buried link — a live dashboard is catnip for funders ("they ship real things").
- **Updates/news strip** from a small `updates.json` — cheap, but shows the lab is active this month, not a 2025 fossil.

### Tier C — nice-to-have
- Newsletter polish (you have `subscribe.html`), press/media-kit refresh, a visual "programmes map."

---

## 3. The grant lens (the *why* behind Tier A)

A funder scans for five things in ~30 seconds: **clear mission** (✓ you nail it), **real output** (✓ 20+ papers), **a credible team**, **momentum**, and **a specific fundable ask**. The current site is strong on the first two and thin on the last three. Tier A closes exactly those gaps — that's why it's Tier A.

---

## 4. Phased roadmap

- **Phase 1 — Motion + polish (1 focused session).** The reveal engine + hero friction-network + micro-interactions on the *existing* pages. Highly visible transformation, near-zero risk (additive JS/CSS, content untouched). I'll build a **live prototype of the homepage** first so you can feel it before we commit.
- **Phase 2 — Function.** The Fund/Partner page + Research-hub filtering + metrics band.
- **Phase 3 — Content/credibility.** Team depth, updates feed, press-kit.

---

## 5. Decisions I need from you

1. **Tier A/B steer** — which functions matter most? (My default: Fund page → Research filtering → metrics band.)
2. **Motion taste** — any hard no on the animated hero network? Some people want restraint; I can do "subtle drift" or "none, just reveals."
3. **Green-light Phase 1?** If yes, I build a live homepage prototype (motion on your real content) as the next artifact for you to react to — no commitment, just something to feel.
