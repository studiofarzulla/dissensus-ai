# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Project Overview

**Site:** dissensus.ai
**Entity:** Dissensus (legal: Dissensus Ltd; incorporation pending, England & Wales)
**Purpose:** UK-based governance alignment research lab. Early-stage, currently under formulation. Home of the Adversarial Systems & Complexity Research Initiative (ASCRI, systems.ac). Focused on the Axiom of Consent framework and friction dynamics formalisation.

**Architecture:** Static HTML/CSS site hosted on Cloudflare Pages. Auto-deploys from GitHub on push. No backend, no build step.

## Brand Position

**Dissensus** is the research lab/org brand (legal: **Dissensus Ltd**, incorporation pending). Lead with "Dissensus" — never "Dissensus AI" or "Dissensus Research Ltd". Grounded in pre-game theory formalization of friction dynamics in multi-agent systems.

**Core thesis:** Coordination has overhead. Delegation produces friction. Friction decomposes into alignment, stake, and entropy.

**This site IS the canonical paper host** (June 2026): `dissensus.ai/papers/<id>` hosts the landing pages + PDFs; `citation_pdf_url` points here. systems.ac (programme landing) and farzulla.org (résumé) link IN; they no longer host papers.

**NOT:** Personal content (→ farzulla.com); the research programme is surfaced via systems.ac (ASCRI).

## Site Structure

```
dissensus-ai/
├── papers.json          # Paper metadata (source of truth for research.html + papers/)
├── tools.json           # Tools/packages catalogue (source of truth for tools.html)
├── projects.json        # Open projects seeking collaborators (-> collaborate.html)
├── build-papers.js      # GENERATES: papers/*, research.html list, tools.html,
│                        #            collaborate.html, sitemap.xml
├── public/              # Deployed to Cloudflare Pages (auto-deploy on git push)
│   ├── index.html       # Homepage — hand-authored (hero, agendas, #proposal, Elsewhere)
│   ├── about.html       # Team & lab (absorbed Services + Partners; #services/#partners)
│   ├── research.html    # Publication archive — list section is GENERATED
│   ├── news.html        # News index; news/*.html posts; news/_drafts/ is held
│   ├── tools.html       # GENERATED from tools.json
│   ├── collaborate.html # GENERATED from projects.json
│   ├── manifesto.html · charter.html · reading.html · press.html · subscribe.html
│   ├── privacy.html · terms.html · 404.html
│   ├── services.html · partners.html · work-with-us.html   # redirect stubs -> index anchors
│   ├── css/             # system.css -> site.css -> index.css (dissensus.css = legacy)
│   ├── js/              # theme.js (theme + toggleNav), motion.js, index.js
│   ├── assets/fonts/    # self-hosted woff2
│   ├── papers/          # GENERATED per-paper pages + hosted PDFs
│   ├── sitemap.xml      # GENERATED
│   └── feed.xml
├── wrangler.json        # Cloudflare Pages config (optional manual deploy)
└── .gitignore           # ignores CLAUDE.md (this file is local-only) and .claude/
```

**Rebuild after editing any of the three JSON files:** `node build-papers.js`

## Team

- **Murad Farzulla** - Founder & Director / Research Lead (ORCID: 0009-0002-7164-8704); sole director + PSC of Dissensus Ltd
- **Andrew Maksakov** - Research Assistant (andrew@resurrexi.io)

## Affiliates

- **Felipe Pachano Azuaje, PhD** - Cross-disciplinary collaborator

## Design System

**Superseded by the 17 Jul 2026 redesign — the old dark/crimson/all-monospace spec is gone.**
Canonical spec: `../\_design-system/DISSENSUS_DESIGN_SYSTEM.md`.

⚠️ **This repo's `public/css/system.css` is AHEAD of `_design-system/system.css`** (12.2 KB vs
7.7 KB). The "master" has not been updated since the redesign — do not sync backwards from it.
systems-ac still carries the older 7.7 KB copy.

**Mode:** light default, dark via `data-theme="dark"` (`js/theme.js`, persisted as `fz-theme`).

**Colors:**
- Background: `#faf8f5` (warm cream) / dark `#0b0b0d`
- Accent: `#800020` (burgundy, brand constant) / dark `#d15570`
- Text: `#1c1917` / dark `#ededed`

**Typography:** Source Serif 4 (headings), Inter (prose), IBM Plex Mono (labels/kickers).
All self-hosted woff2 in `public/assets/fonts` — **no font CDN**.

⚠️ **Subsets are not just weights.** The `*-latin-*` files stop at ~230 codepoints. Inter also
ships `greek-{400,500,600,700}` and `latin-ext-400`, declared after the latin faces in
`system.css` with `unicode-range` guards — the friction notation (α σ ε τ ρ φ ψ Δ Σ) and the
`ħ` in the temporal-bitmap post live there. **Adding a new Inter weight means adding its greek
subset too**, or Greek at that weight silently drops to a system sans mid-sentence.

Known, deliberate fallbacks — do not "fix" these:
- **Greek in mono.** IBM Plex Mono has no Greek at any weight, from any source. Mono Greek
  falls back and always has.
- **`ə ɛ ɪ` in the homepage `/dɪˈsɛnsəs/`.** Plex Mono's latin-ext carries `ə` but not `ɛ` or
  `ɪ`, so shipping it would split one 11-character string across two fonts. A uniform fallback
  is the better of two bad options.
- **`→ ↗ ◙ ← ⟨ ⟩`.** Outside Inter's charset entirely, in every subset.

Source Serif 4 needs no Greek: no Greek character reaches a serif element (verified by walking
every text node on all 42 pages).

**Stylesheet layering:** `system.css` (shared design system) → `site.css` (site components)
→ `index.css` (homepage only). `dissensus.css` is the pre-redesign sheet, still present but
only referenced by legacy pages — do not add to it.

**Signature components:** mono kicker at 0.28em, mono section index (`01 · Label`),
56×3px burgundy rule, `.card` / `.pill` / `.btn--ghost`, `.grid--wide` (two explicit columns
above 52rem) for content-rich records.

## Navigation

```
[Mark] Dissensus   Home | About | Research | News | Tools | Collaborate | ASRI ↗ | ◙ theme
```

Hamburger below 880px (`.nav__burger` → `#nav-menu.is-open`, `toggleNav()` in `js/theme.js`).

Footer: two blocks — legal/registration + `.footer__social` (LinkedIn, GitHub) on the left,
the link list on the right. Both come from `getFooterHtml()` in `build-papers.js`; the
hand-authored pages carry an identical inlined copy, so **a footer change must be made in the
generator AND swept across the static pages**.

## Canonical off-site URLs

| Surface | URL |
|---------|-----|
| LinkedIn (company) | `https://www.linkedin.com/company/dissensus-ai/` |
| GitHub org | `https://github.com/dissensus-ai` |
| Zenodo community | `https://zenodo.org/communities/dissensus` (the old `/farzulla` slug is **410**) |
| ASRI dashboard | `https://asri.dissensus.ai` |

⚠️ `linkedin.com/company/dissensus-research` is an **unrelated Turkish company** — never link it.

## Key Content Sections (Homepage)

1. **Hero** - Title + satirically verbose academic tagline + simple translation + network viz
2. **The Problem** - Why game theory isn't enough, friction equation
3. **Current Work** - Four research areas (market microstructure, computational methods, formal framework, applied domains)
4. **Team** - Founder & research lead (Murad) + research assistant (Andrew)
5. **Roadmap** - Research timeline and open needs

## Development

**Local preview:**
```bash
python -m http.server 8000 --directory public
# OR
npx serve public
```

**Deploy:**
```bash
git push origin master
# Auto-deploys via Cloudflare Pages
# Manual deploy (if needed): npx wrangler pages deploy public --project-name dissensus-ai
```

**Branch:** Uses `master` (not `main`)

## Links & Integration

- Published papers: **hosted here** (`dissensus.ai/papers/<id>`) — farzulla.org no longer hosts them
- Research programme: systems.ac (ASCRI)
- Personal: farzulla.com · résumé: farzulla.org
- Contact: research@dissensus.ai
- **Site repo stays under `studiofarzulla/dissensus-ai`** — Cloudflare Pages uses git integration
  here, so transferring it to the `dissensus-ai` org would sever the deploy hook. Research code
  lives in the org; this repo does not.
- resurrexi.io / resurrexi.dev: retired to placeholders

## Content Guidelines

**Tone:** Intellectually serious but self-aware. The satirical tagline sets the vibe - we know academic jargon is absurd, but the underlying research is rigorous.

**Voice:** Third person for formal sections, first person for the "About" section.

## What NOT to Do

- Don't add complexity (no frameworks, no bundlers — `build-papers.js` is zero-dependency Node)
- Don't hand-edit generated files (`tools.html`, `collaborate.html`, `papers/*.html`,
  `sitemap.xml`, the publications list in `research.html`) — edit the JSON or the generator
- Don't write "Dissensus AI" or "Dissensus Research Ltd"; the entity is **Dissensus** / **Dissensus Ltd**
- Don't use "Rejected" / "With Editor" in public copy — only "Under Review", "Preprint", or absent
- Don't add a font CDN or any external asset host
- Don't use corporate/marketing language

## Open items for MF

- The GitHub org description still reads *"Dissensus AI is a research group…"* — a brand-rule
  violation on a public surface (github.com/dissensus-ai).
- No X/Twitter handle on record; the homepage "Elsewhere" anchor stays commented out until there is one.

---

**Last Updated:** 30 July 2026
