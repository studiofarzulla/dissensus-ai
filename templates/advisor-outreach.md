# Advisor outreach — templates and rules

Local working document. **Not deployed** (nothing outside `public/` ships to Cloudflare Pages).

Companion to `advisors.json`. The site publishes nothing about advisors until a name is
added to that file, and a name goes in **only** after written confirmation.

---

## The rules, before the templates

1. **Written consent before listing. No exceptions.** An email saying "yes, happy to be
   listed" is enough; an encouraging call is not. Seniors check their own web presence,
   and one person discovering they've been listed without agreeing costs more than the
   entire board is worth.
2. **Confirm the exact wording of their name, title and affiliation** by quoting it back.
   Institutions are particular about this, and getting a title wrong reads as careless.
3. **Say the ask is bounded, in the first three sentences.** The reason senior people
   decline advisory roles is fear of unbounded obligation. Removing that fear is most of
   the work.
4. **Say what it is not**: not a directorship, no Companies House filing, no fiduciary
   duty, no liability, no fundraising expectation. Dissensus Ltd has one director and
   that stays true.
5. **Do not ask for money, introductions, or fundraising help in the same message.**
   Combining the asks converts a cheap yes into an expensive no.
6. **Lead with the work, not the org chart.** The lab's credibility is 20 papers, a
   Digital Finance accept, Lean 4 formalisations and a live index — not its ambitions.
7. **Offer the exit up front.** "Ask and the listing comes down the same day" costs
   nothing and materially raises the yes rate.

## Who to ask, in order of likelihood

Warmest first — cold emails to famous people are the least efficient version of this.

- **Referees and editors who have already engaged the work.** Someone who wrote a
  substantive report on one of the papers has already donated an hour and shown interest.
  This is the single best pool.
- **Supervisors and examiners** from KCL and SOAS, and anyone who has co-authored with them.
- **People who have publicly disagreed with a Dissensus paper.** A good critic is a better
  advisor than a friendly stranger, and the invitation flatters the criticism.
- **Retired or emeritus academics.** Time-rich, title-secure, and frequently glad to be
  asked. Chronically under-approached by early-stage labs.
- **Practitioners with standing but no publication incentive** — a financial supervisor,
  a regulator, a quant risk lead. For the applied and policy work these are worth more
  than another academic.
- **Adjacent small labs and programmes** (Syneidocracy, ASCRI's network). Cross-listing
  is a mutual trade, not a favour.

Aim for four to six people across finance/econometrics, AI governance or safety,
political economy, and formal methods. Do not aim for a big board.

---

## Template A — cold or semi-cold, to a senior academic

> **Subject:** Advisory (two calls a year) — Dissensus, independent friction-dynamics lab
>
> Dear Professor {Surname},
>
> I'm writing with a deliberately small ask: I'd like to invite you to join the advisory
> group of Dissensus, an independent research lab I run in London, and the whole
> commitment is **two calls a year of about an hour, plus your name on the website**.
> There's no reading obligation between them, no standing meetings, and no minimum.
>
> To be explicit about what it isn't: it isn't a directorship or a company office, there's
> no Companies House filing, no fiduciary duty, no liability for anything the lab
> publishes, and no expectation that you fundraise or make introductions. It's unpaid in
> both directions — I can't offer an honorarium, and I'm not asking you for anything
> beyond research judgement. If you ever want out, the listing comes down the same day,
> with no explanation owed.
>
> The reason I'm asking you specifically is {ONE OR TWO SENTENCES, SPECIFIC — a paper of
> theirs that changed how you framed something, a method of theirs you're using, a
> critique of yours their work would sharpen. If this paragraph is generic, do not send
> the email.}
>
> What the lab is: Dissensus formalises friction dynamics in multi-agent systems — the
> proposition that coordination has overhead, delegation produces friction, and friction
> decomposes into alignment, stake and entropy. Twenty papers so far, four on arXiv, one
> accepted at Digital Finance (Springer) last week, four under review. The formal core is
> machine-checked in Lean 4 and the systemic-risk index runs daily at asri.dissensus.ai.
> Everything is open access, and when a result fails we publish the failure — the Digital
> Finance paper reports its own null under dependence-robust inference.
>
> What I actually want from an advisory group is someone who will tell me when a claim
> doesn't hold. The lab is two researchers and an affiliate, which is exactly the size at
> which a lab starts agreeing with itself.
>
> Nearest starting point if you'd like to see the work before deciding:
> {LINK TO THE ONE MOST RELEVANT PAPER}.
>
> Either answer is genuinely fine, and no reply is a fine answer too.
>
> With thanks,
> Murad Farzulla
> Founder & Research Lead, Dissensus (Dissensus Ltd, England & Wales no. 17309927)
> dissensus.ai · ORCID 0009-0002-7164-8704 · 020 3807 1624

## Template B — to a referee or editor who has already engaged the work

> **Subject:** Thank you for the {venue} report — and a small ask
>
> Dear {Name},
>
> Your report on {paper} did the thing referee reports rarely do: it changed the paper
> rather than just grading it. {ONE SPECIFIC THING THEY CAUGHT, AND WHAT YOU CHANGED.}
>
> Which is why I'm asking: would you be willing to be listed as an advisor to Dissensus?
> The ask is two calls a year of about an hour and your name on the site — no fiduciary
> duty, no company office, no fundraising, unpaid in both directions, and you can have the
> listing removed the same day you ask.
>
> You've already done the expensive version of this once for free. I'd rather ask than
> assume, and no is an easy answer.
>
> {SIGNATURE}

## Template C — to a practitioner (supervisor, regulator, quant risk lead)

Swap the credibility paragraph in Template A for the applied surface, which is what this
reader weighs:

> The applied side is what you'd be looking at: a systemic-risk index running daily
> against live data, GARCH-family estimators published as open source with tests, and
> Lean 4 formalisations where the assumptions are tracked in an explicit ledger rather
> than buried in prose. The policy work is where I'd most want your ear — one paper argues
> that financial regulators are the modal receiver of the first AI-involved systemic
> event, and that the mandate-boundary claim in it is exactly what a referee will attack.

Add, where true: *"I'm not asking you to represent your employer, and the listing would
name you rather than {institution}."* Practitioners in regulated posts need that sentence
before they can say yes.

---

## Confirmation reply to send once they agree

> Thank you — that's genuinely appreciated. So the record is unambiguous, here's exactly
> what will appear on dissensus.ai/join:
>
> **{Name}** — {Role, e.g. Advisor} · {Affiliation as they want it written}
> {One or two sentences of bio, if they want one}
> {Any links: personal site, ORCID, Scholar}
>
> Could you confirm that wording is right, and correct anything that isn't? Nothing else
> about you gets published without asking first, and the listing comes down the same day
> if you ever want it to.
>
> I'll be in touch about a first call in {month}. Between now and then there is nothing
> you need to do.

Once that confirmation arrives: add the entry to `advisors.json`, run
`node build-papers.js`, and check `public/join.html` renders the name correctly before
pushing. Keep the confirmation email — it is the only record that consent was given.

## Log

Keep the pipeline here so nobody gets asked twice. Delete nothing; a "no" is
information.

| Date | Person | Route | Status | Notes |
|------|--------|-------|--------|-------|
| | | | | |
