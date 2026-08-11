# dissensus.ai rebuild plan — August 2026

Style (fonts, cream/burgundy, logo) **stays**. This is an information-architecture and content diet, not a redesign.

## Shipped — 10 Aug 2026

Phases 0–2 are done, plus the theme cleanup that had been parked in Phase 3.

### Content diet
- [x] **Deleted** `manifesto` · `charter` · `reading` · `press` · `subscribe` (files removed, not just
      redirected — leaving both in place made it ambiguous which the host served, and the
      sitemap advertised them for three weeks after the 301s landed)
- [x] **Deleted** the `services` / `partners` / `work-with-us` meta-refresh stubs; all three are
      server-side 301s in `_redirects` now
- [x] `charter` content absorbed into **About → Commitments** (`/about#commitments`)
- [x] Root pages: **17 → 10**
- [x] Dead `css/dissensus.css` (52 KB, referenced by nothing) removed. CSS 108 KB → 64 KB

### Recruiting surfaces (new)
- [x] `collaborate.html` (4,022 words, unreadable) **split**: `join.html` (2,302) +
      `projects.html` (4,083, the dossiers). `/collaborate` 301s to `/join`
- [x] **`roles.json`** — three-rung ladder (Contributor → Research Collaborator → Research
      Affiliate) with what each rung actually gives, and 14 **hour-sized entry tasks** drawn
      from the real gaps in `projects.json`, at the sizes the project notes themselves use
      ("a weekend", "an afternoon", "one inference run", "fifteen minutes")
- [x] **`advisors.json`** — machinery built, `advisors: []`, and
      `generateAdvisorySection()` returns `''` while it is empty, so **nothing publishes**
      until a real name with written consent is added. `showWhileEmpty` flips the bounded
      ask on without names
- [x] `templates/advisor-outreach.md` — outreach templates, the bounded ask, who to
      approach in what order, and the confirm-before-listing rule
- [x] `templates/affiliate-letter.md` — the signed letter that makes the Affiliate title
      worth holding, with the not-employment wording
- [x] A "what the lab does **not** offer" section, stated plainly

### Homepage + About
- [x] Metrics band removed — it restated the hero stats verbatim (both counted 20 papers,
      three screens apart)
- [x] `#net` hero canvas removed: up to ~1,770 pairwise distance calculations per frame,
      forever, on or off screen, to draw a graph that could have been any lab's. The
      shared burgundy hero glow came back in its place (its `content: none` override went
      too), and the hero is now two columns with the stats panel filling the right
- [x] `#optima` kept and retuned from the dark-mode pink to true burgundy, and it now
      pauses via IntersectionObserver when scrolled out of view
- [x] Homepage proposal form removed — it posted to the same Formspree endpoint as the Join
      form with a different field set, so one inbox got two incompatible intake schemas.
      `join.html` owns intake
- [x] About: **8 sections → 5** (Domains folded into Mission, Services + Partners merged,
      Company + Contact merged). Both `#services` and `#partners` anchors kept live

### Single theme
- [x] Dark path deleted from `system.css`, `site.css`, `index.css` and `theme.js`. No
      `[data-theme]` selector remains. `theme.js` **kept** — it sets `html.js`, which gates
      the reveal-on-scroll hiding rule (see b21d046), and hosts `toggleNav()`
- [x] One nav brand mark (wine) instead of a wine/white pair — one fewer image request on
      every page in the site
- [x] Dead `.toggle` CSS removed

### Updates
- [x] `news.html` gets a dated **"Where things stand"** status block above the posts —
      publications, latest accept, venues under review, what is running, what is open to
      collaborators, and the size of the lab
- [x] Nav label and homepage band read **Updates**; URLs stay `news.html` / `/news/*`
      because those posts are published and shareable

### Round two — homepage reads as a lab, not a thesis (MF review)

Two notes from MF on the shipped homepage, both acted on.

- [x] **The strip and the ribbon were the same content twice.** The ribbon's ten chips
      restated the credibility strip's four arXiv IDs, its Digital Finance accept and its
      under-review venues, as an auto-scrolling marquee running a rAF loop for the life of
      the page. Ribbon deleted (markup, CSS, JS); strip slimmed from three rows to two by
      folding Accepted and Under review into one peer-review line.
- [x] **`02 · The problem` removed from the homepage.** A lab front page that opens by
      arguing game theory is insufficient is presenting a thesis, not introducing an
      organisation. The friction equation moved to `research.html` → **Notation**, directly
      above the cards that define its symbols; the three α/σ/ε cards were simply dropped,
      because that section already defined F, α, σ, ε, Λ and Ψ in more detail. Nothing was
      lost. The homepage keeps one plain sentence of the thesis, linking to Research.
      Equation CSS moved from `index.css` (scoped `.home`) to `site.css` unscoped —
      research.html loads only system + site, so it would otherwise have rendered unstyled.
- [x] **`02 · The lab`** added: Murad, Andrew, Felipe as a compact three-up linking to
      About. A lab front page showing nobody reads as a solo blog. New `.crew` component,
      deliberately not site.css's `.person` (88px avatar + biography — that is About's job).
- [x] **Three featured tasks on the front door**, generated by `syncHomeTasks()` from
      `roles.json` `entryTasks` where `featured: true`, between `OPEN-TASKS` markers. The
      front page cannot drift from Join — the version before this listed three research
      directions that appeared nowhere else on the site.

Homepage sections are now `01 Who we are · 02 The lab · 03 Contribute · 04 Elsewhere`.

### Round three — leaner still (MF review)

- [x] **X and Discord added.** `https://x.com/dissensusAI` and
      `https://discord.gg/5VtRcb45N7`, in the footer row and the homepage Elsewhere row.
      One `SOCIALS` list in `build-papers.js` now drives both, and the homepage row is
      written between `SOCIAL` markers — the X anchor previously sat commented out in
      `index.html` waiting to be uncommented by hand. X is in the Organization JSON-LD
      `sameAs` too. Discord also became the second CTA on Join.
- [x] **Research page cut back.** Notation section gone — the equation "does no work"
      on an archive page, and the six symbol cards existed to gloss it; the papers carry
      the formalism. Its "Cite framework" button called a `copyBibTeX()` that was never
      defined on that page, so it had been broken. Lineage and Timeline gone. Sections are
      now `01 The agenda · 02 Archive · 03 Tools`.
- [x] **Tools folded into Research and out of the nav.** `generateToolsPage()` became
      `generateToolsSection()`, injected between `TOOLS` markers in research.html by
      `updateResearchPage()`; `tools.html`, `toolsNavHtml()` and `toolsFooterHtml()` are
      deleted, `/tools` 301s to `/research#tools`, and the two prose links to it (About's
      services paragraph, the news status block) now point at the anchor.
- [x] **Homepage at-a-glance panel removed** (focus / publications / latest accept /
      status). The accept is in the updates band immediately below it and the paper count
      is on Research. The hero is a single column again, and the two-column grid CSS went
      with it.
- [x] **Join reframed.** It led on "No money." — accurate but a deficit-first pitch. It now
      leads on the actual situation: a lab that started this year, where what it works on
      and how it decides a result is finished are still open, so joining now means shaping
      it rather than filling a slot. H1 is "A new lab, still deciding what it is." The
      money facts are unchanged but sit under **The limits**, framed as a funding
      constraint that carries first refusal rather than a policy. The homepage Contribute
      paragraph was rewritten to match, since it still opened on the old framing.
- [x] The friction-equation CSS added to `site.css` earlier in this session was deleted —
      with the equation gone from every page it was dead within the hour.

### Fixes found on the way
- [x] `.section > .container > h2` never matched generated pages — they write
      `<section class="section container">`, one element with both classes, so every h2 on
      join, projects, tools and research sat flush against its next paragraph
- [x] `.hero--editorial` added: `--fs-hero` tops out at 4.25rem, which read as a product
      splash on a three-line headline
- [x] Sitemap no longer lists redirecting URLs; `join.html` ranks at 0.8
- [x] 404 stopped offering the manifesto and reading list; its description too

**Nav:** `Home · Research · Projects · Tools · Join · About · News`

## Verified

- `node build-papers.js` clean; 20 paper pages + tools + projects + join + sitemap
- Headless Chromium across home/join/projects/news/about/research/tools: **no JS errors**,
  and every `[data-reveal]` element resolves visible after scroll (the b21d046 failure mode)
- No horizontal scroll at 390px on any page. `documentElement.scrollWidth` reads 429 there,
  but that is the hero glow's deliberate `-10%` bleed (390 × 1.1) and `html { overflow-x: clip }`
  makes it unscrollable — pre-existing, not a regression
- No `[data-theme]`, `fz-theme`, `toggleTheme` or dead-page reference left in any shipped file

## Contact channels (canonical)

| Channel | Value |
|---------|--------|
| Phone | `020 3807 1624` · `+44 20 3807 1624` · `tel:+442038071624` |
| Email | research@dissensus.ai · murad@dissensus.ai |
| Form | https://formspree.io/f/mreezoko |
| Book 15 min | https://cal.com/dissensus/15min |

---

## Still open

**Needs Murad, not code:**

1. **Advisor names.** `advisors.json` stays empty until people say yes in writing. Start with
   referees who have already written substantive reports — they have donated the expensive
   hour already. `templates/advisor-outreach.md` has the sequence.
2. ~~Confirm the `dissensus.ai` email alias promised in the Affiliate tier.~~ **Confirmed
   available (MF, 10 Aug).** The line stays; the alias gets created when the first Affiliate
   is appointed, not before.
3. **First refusal on paid roles** is promised in two tiers. It costs nothing now and is
   honest, but it is a promise — keep a list of who holds it.
4. **`CLAUDE.md` is gitignored** and still describes the old IA (collaborate.html, the
   dark theme, 17 root pages). Update the local copy.
5. **GitHub org description** still reads "Dissensus AI is a research group…" — a brand-rule
   violation on a public surface.
6. **No X/Twitter handle**; the homepage "Elsewhere" anchor stays commented out.

## Deployment state

As of the last push, this work is on `claude/website-redesign-content-2wbk0e` behind draft
PR #1 and built only to a Cloudflare **preview** URL. Production deploys from `master`, so
`dissensus.ai` still serves the pre-diet site until the PR is merged.

**Optional later:**

- Partner logos (Syneidocracy) on About
- Cal.com embed vs link-out (link-out is enough)
- A second pass on `projects.html` at 4,083 words — the dossiers are long, but the length is
  load-bearing: the unflattering detail is the recruiting argument

## Non-goals

- New visual brand
- Paying for a second CMS
- Fake full org chart on Join
- Giving away Companies House directorship via a careers page
- Unpaid ops/comms/board roles
