# dissensus.ai rebuild plan — August 2026

Style (fonts, cream/burgundy, logo) **stays**. This is an information-architecture and content diet, not a redesign.

## Already done (this session)

- [x] Canonical contact in agent memories (Claude / Codex / Grok)
- [x] Phone `020 3807 1624` + Cal.com 15 min + Formspree on **About → Get in touch**
- [x] Same contact line in **site-wide footer** via `build-papers.js` → `syncStaticChrome`

## Contact channels (canonical)

| Channel | Value |
|---------|--------|
| Phone | `020 3807 1624` · `+44 20 3807 1624` · `tel:+442038071624` |
| Email | research@dissensus.ai · murad@dissensus.ai |
| Form | https://formspree.io/f/mreezoko |
| Book 15 min | https://cal.com/dissensus/15min |

---

## Phase 0 — Ship contact + DF accept (small, now)

1. Commit + push footer/about contact (this PR)
2. `papers.json`: multi-moment → **Accepted / Forthcoming @ Digital Finance** (not under-review)
3. Home paper ribbon chip: same status flip
4. Optional: one **News** post for DF accept (or skip News until Phase 2)
5. Push → Cloudflare Pages

---

## Phase 1 — Bare-bones IA (structure)

**Target nav:** `Home · Research · Tools · Work with us · About`  
(no ASRI in nav; no theme toggle — **light only**)

| Keep as real pages | Demote / redirect elsewhere |
|--------------------|-----------------------------|
| Home (thinner) | Manifesto → 301 home or systems.ac |
| Research | Charter → short blurb on About + 301 |
| Tools (ASRI as card) | Reading → 301 home or farzulla.org |
| Work with us (rename Collaborate) | Press → 301 About#contact |
| About (team, partners/network, company, contact) | Subscribe → footer RSS only |
| Privacy / Terms | News → keep thin **or** fold into Home until used |

**About shape (keep separate):**
1. What the lab is (short; **remove formula block**)
2. Team (you as Founder & Research Lead / Director)
3. Partners / network (Syneidocracy + room to grow)
4. Company (Ltd, independence — short)
5. Contact (phone, email, book, form) — done

**Work with us (three lanes):**
1. Open research projects (`projects.json`)
2. Positions (honest: none / or concrete research collabs only)
3. Organisations (short; book or email)

**Unpaid org chart:** do not list ops/comms/board as open unpaid roles. Research collabs only.

---

## Phase 2 — Content truth

1. Sync `papers.json` from `PORTFOLIO_CANONICAL_TRUTH.md` (statuses, venues, links)
2. Rebuild: `node build-papers.js`
3. Home: fewer chips, DF accept visible, less motion noise if it still feels “extra”
4. News habit: post only on accepts / company events (or kill News page)

---

## Phase 3 — Optional later

- Single theme CSS cleanup (delete dark path dead code)
- Partner logos (Syneidocracy) on About
- Cal.com embed vs link-out (link-out is enough for v1)
- Formspree stays on home proposal form; About links to same endpoint

---

## Non-goals

- New visual brand
- Paying for a second CMS
- Fake full org chart on Work with us
- Giving away Companies House directorship via a careers page

---

## Suggested ship order

```
A. Contact footer + About  (done locally — commit/push)
B. papers.json DF accept + rebuild + push
C. Nav/footer strip + About formula kill + Work with us rename
D. Redirects for manifesto/charter/reading/press/subscribe
E. Partners (Syneidocracy) + thinner home
```

Each letter is one PR or one evening’s work.
