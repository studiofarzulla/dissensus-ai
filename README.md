# Dissensus

**Adversarial systems research lab** founded by [Murad Farzulla](https://farzulla.org).

Live site: [dissensus.ai](https://dissensus.ai)

## About

Dissensus investigates stability, alignment, and friction dynamics in complex adversarial systems. The lab's research programme spans computational finance, political economy, AI alignment, and formal methods, with 25+ publications to date.

Each paper is a proof-of-concept for a different application domain -- political governance, financial markets, developmental psychology, AI alignment -- unified by the study of how competing interests generate structural conflict.

## Tech Stack

- Static HTML/CSS/JS
- Node.js build pipeline
- Cloudflare Pages deployment

## Build

```bash
node build-papers.js
```

Regenerates paper pages from `papers.json`, along with the research list, `sitemap.xml`,
`llms.txt` and the JSON-LD blocks on the news posts.

After a deploy, `node indexnow.js` submits the sitemap's URLs to the IndexNow engines
(Bing, Yandex, Naver); Google does not participate and is fed by the sitemap instead.

## Related

- [ASCRI](https://systems.ac) -- Adversarial Systems & Complexity Research Initiative
- [Farzulla Research](https://farzulla.org) -- Personal research portfolio
- [ORCID](https://orcid.org/0009-0002-7164-8704) | [Google Scholar](https://scholar.google.com/citations?user=bmplqfwAAAAJ)
