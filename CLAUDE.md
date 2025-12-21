# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Project Overview

**Site:** dissensus.ai
**Purpose:** Governance alignment research lab - the formal academic research arm focused on the Axiom of Consent framework.

**Architecture:** Static HTML/CSS site hosted on Cloudflare Workers. No backend, no build step.

## Brand Position

**Dissensus** is the research lab brand. Grounded in pre-game theory formalization of friction dynamics in multi-agent systems.

**Core thesis:** Coordination has overhead. Delegation produces friction. Friction decomposes into alignment, stake, and entropy.

**NOT:** Personal content (→ farzulla.com), technical infrastructure (→ resurrexi.io/dev), or paper hosting (→ farzulla.org)

## Site Structure

```
dissensus-ai/
├── public/              # Deployed to Cloudflare Workers
│   ├── index.html       # Single-page site
│   ├── css/
│   │   └── dissensus.css
│   ├── assets/          # Images, logos
│   └── sitemap.xml
├── wrangler.json        # Cloudflare Workers config
└── .gitignore
```

## Design System

**Aesthetic:** Dark academia meets surveillance capitalism critique. Monospace typography, crimson accents, network visualization.

**Colors:**
- Background: `#050505` (near-black)
- Accent: `#DC143C` (crimson)
- Text: `#e8e8e8` (off-white)
- Secondary: `#888888` (gray)

**Typography:**
- Monospace throughout (research lab vibe)
- Equation blocks with distinctive styling

## Key Content Sections

1. **Hero** - Title + satirically verbose academic tagline + simple translation
2. **The Problem** - Why game theory isn't enough, friction equation
3. **Current Work** - Four research areas (market microstructure, computational methods, formal framework, applied domains)
4. **About** - Lab context, PhD discussions, contact

## Development

**Local preview:**
```bash
python -m http.server 8000 --directory public
# OR
npx serve public
```

**Deploy:**
```bash
npx wrangler pages deploy public --project-name dissensus-ai
# OR push to GitHub (auto-deploys via Cloudflare Pages)
```

**Branch:** Uses `master` (not `main`)

## Links & Integration

- Published papers: farzulla.org
- Technical infrastructure: resurrexi.io
- Technical docs: resurrexi.dev
- Personal: farzulla.com
- Contact: lab@dissensus.ai
- GitHub: studiofarzulla/dissensus-ai

## Content Guidelines

**Tone:** Intellectually serious but self-aware. The satirical tagline sets the vibe - we know academic jargon is absurd, but the underlying research is rigorous.

**Voice:** Third person for formal sections, first person for the "About" section.

## What NOT to Do

- Don't add complexity (no frameworks, no build tools)
- Don't duplicate content from farzulla.org
- Don't add blog functionality (that's resurrexi.dev)
- Don't use corporate/marketing language

---

**Last Updated:** December 2025
