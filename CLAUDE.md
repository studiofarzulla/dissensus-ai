# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Project Overview

**Site:** dissensus.ai
**Entity:** Dissensus AI (incorporation pending, England & Wales)
**Purpose:** UK-based governance alignment research lab. Early-stage, currently under formulation. Home of the Adversarial Systems & Complexity Research Initiative (ASCRI, systems.ac). Focused on the Axiom of Consent framework and friction dynamics formalisation.

**Architecture:** Static HTML/CSS site hosted on Cloudflare Pages. Auto-deploys from GitHub on push. No backend, no build step.

## Brand Position

**Dissensus** is the research lab brand. Grounded in pre-game theory formalization of friction dynamics in multi-agent systems.

**Core thesis:** Coordination has overhead. Delegation produces friction. Friction decomposes into alignment, stake, and entropy.

**NOT:** Personal content (→ farzulla.com), technical infrastructure (→ resurrexi.io/dev), or paper hosting (→ farzulla.org)

## Site Structure

```
dissensus-ai/
├── public/              # Deployed to Cloudflare Pages (auto-deploy on git push)
│   ├── index.html       # Homepage - research overview, team summary, roadmap
│   ├── about.html       # Team & lab page - full bios, mission, approach
│   ├── services.html    # Services & capabilities - commercial engagement paths
│   ├── manifesto.html   # Research manifesto
│   ├── charter.html     # Lab charter (UK Ltd governance)
│   ├── collaborate.html # Collaboration proposals
│   ├── reading.html     # Reading list
│   ├── press.html       # Press/media kit
│   ├── subscribe.html   # Newsletter signup
│   ├── privacy.html     # Privacy policy (UK GDPR compliant)
│   ├── terms.html       # Terms of use
│   ├── 404.html         # Error page
│   ├── css/
│   │   └── dissensus.css
│   ├── assets/          # Images, logos
│   ├── sitemap.xml
│   └── feed.xml         # RSS feed
├── wrangler.json        # Cloudflare Pages config (optional manual deploy)
└── .gitignore
```

## Team

- **Davud Farzullayev** - Director
- **Murad Farzulla** - Research Fellow (ORCID: 0009-0002-7164-8704)
- **Andrew Maksakov** - Research Assistant (andrew@resurrexi.io)

## Affiliates

- **Charles Mitteregger, MSc** - KCL Finance Analytics cohort
- **Felipe Pachano Azuaje, PhD** - Cross-disciplinary collaborator

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

## Navigation

```
[Logo] dissensusAI     Research | Services | About | Collaborate | [Contact →]
```

Footer: Research · Services · About · Collaborate · Manifesto · Charter · Reading · Press · Subscribe · Privacy · Terms · RSS

## Key Content Sections (Homepage)

1. **Hero** - Title + satirically verbose academic tagline + simple translation + network viz
2. **The Problem** - Why game theory isn't enough, friction equation
3. **Current Work** - Four research areas (market microstructure, computational methods, formal framework, applied domains)
4. **Team** - Director & Head of Engineering
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

- Published papers: farzulla.org
- Technical infrastructure: resurrexi.io
- Technical docs: resurrexi.dev
- Personal: farzulla.com
- Contact: research@dissensus.ai
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

**Last Updated:** February 2026
