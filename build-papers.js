#!/usr/bin/env node
/**
 * Dissensus — Paper Page Generator
 * Generates individual paper pages with Google Scholar metadata from papers.json
 * Zero npm dependencies (Node.js fs + path only)
 *
 * Run: node build-papers.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Load Data ───────────────────────────────────────────────────────────────

const papersData = JSON.parse(fs.readFileSync('papers.json', 'utf8'));
const papers = papersData.papers;
const tagLabels = papersData.tags;
const statusLabels = papersData.statuses;
const programs = papersData.programs;

// Tools/packages catalog (mirrors papers.json). Optional — page is skipped if absent.
const toolsData = fs.existsSync('tools.json')
  ? JSON.parse(fs.readFileSync('tools.json', 'utf8'))
  : null;
// Open projects looking for collaborators. Optional — projects.html is skipped if absent.
const projectsData = fs.existsSync('projects.json')
  ? JSON.parse(fs.readFileSync('projects.json', 'utf8'))
  : null;
// Roles ladder + hour-sized entry tasks. Optional — join.html is skipped if absent.
const rolesData = fs.existsSync('roles.json')
  ? JSON.parse(fs.readFileSync('roles.json', 'utf8'))
  : null;
// Senior advisors. The section renders NOTHING while `advisors` is empty (unless
// showWhileEmpty is set), so no placeholder or fabricated name can reach the site.
const advisorsData = fs.existsSync('advisors.json')
  ? JSON.parse(fs.readFileSync('advisors.json', 'utf8'))
  : null;
const papersById = Object.fromEntries(papers.map(p => [p.id, p]));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// JSON-LD lives inside <script>, so values need JSON escaping, not HTML escaping —
// escapeHtml() was shipping &#039; where an apostrophe belonged, and Google reads that
// literally. `<\/` guards against a value containing </script> ending the block early.
function jsonLd(value) {
  return JSON.stringify(String(value == null ? '' : value)).slice(1, -1).replace(/<\//g, '<\\/');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCitationDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function generateBibTeX(paper) {
  const year = new Date(paper.date).getFullYear();
  const firstAuthor = paper.authors[0].split(' ').pop().toLowerCase();
  const shortTitle = paper.id.replace(/-/g, '');
  const key = `${firstAuthor}${year}${shortTitle}`.substring(0, 40);

  const doi = paper.doi || paper.zenodo || '';
  const doiLine = doi ? `  doi = {${doi}},\n` : '';

  return `@misc{${key},
  author = {${paper.authors.map(a => { const parts = a.split(' '); return parts[parts.length-1] + ', ' + parts.slice(0,-1).join(' '); }).join(' and ')}},
  title = {${paper.title}},
  year = {${year}},
  howpublished = {Dissensus ${paper.wpNumber && paper.wpNumber.startsWith('DP') ? 'Discussion' : 'Working'} Paper${paper.wpNumber ? ' ' + paper.wpNumber : ''}},
${doiLine}  url = {https://dissensus.ai/papers/${paper.id}}
}`;
}

// ─── Nav HTML (matches existing pages) ───────────────────────────────────────

function getNavHtml(activeLink, prefix = '../') {
  const item = (href, label, key) =>
    `      <a href="${prefix}${href}"${activeLink === key ? ' class="is-active"' : ''}>${label}</a>`;
  // Bare-bones nav: no ASRI, no theme toggle (single light theme). One brand mark —
  // the wine mono mark — since there is no dark background to swap for any more.
  return `  <nav class="nav">
    <a href="${prefix}index.html" class="nav__brand"><img src="${prefix}assets/dissensus-mark-mono-wine.png" alt="" class="nav__brand-mark"> Dissensus</a>
    <button class="nav__burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu" onclick="toggleNav(this)"><span></span><span></span><span></span></button>
    <div class="nav__links" id="nav-menu">
${item('index.html', 'Home', 'home')}
${item('research.html', 'Research', 'research')}
${item('projects.html', 'Projects', 'projects')}
${item('join.html', 'Join', 'join')}
${item('about.html', 'About', 'about')}
${item('news.html', 'News', 'news')}
    </div>
  </nav>`;
}

// Social marks are inlined (no CDN, no external fetch — matches the self-hosted-assets rule).
// One list drives the footer row and the homepage "Elsewhere" section, so a new channel is
// added in exactly one place. X and Discord landed Aug 2026 — before that the X anchor sat
// commented out in index.html because no handle existed, and it had to be uncommented by hand.
const SOCIALS = [
  { label: 'LinkedIn', url: 'https://www.linkedin.com/company/dissensus-ai/',
    path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z' },
  { label: 'X', url: 'https://x.com/dissensusAI',
    path: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.4z' },
  { label: 'Discord', url: 'https://discord.gg/5VtRcb45N7',
    path: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c1.8483 1.3568 3.6396 2.1808 5.3973 2.7273a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.198.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 5.3993-2.7273a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z' },
  { label: 'GitHub', url: 'https://github.com/dissensus-ai',
    path: 'M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.83.58A12 12 0 0 0 12 .3z' },
  { label: 'Zenodo', url: 'https://zenodo.org/communities/dissensus',
    path: 'M3 3h18v4H3V3zm2 6h14v12H5V9zm4 3v2h6v-2H9z' },
];

function socialLink(s) {
  return `<a href="${s.url}" target="_blank" rel="noopener" aria-label="Dissensus on ${s.label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${s.path}"/></svg>${s.label}</a>`;
}

function getSocialHtml() {
  return `<p class="footer__social">
${SOCIALS.map(socialLink).join('\n')}
</p>`;
}

// Public contact — keep in sync with ~/.claude/CLAUDE.md / site CLAUDE.md
const PHONE_DISPLAY = '020 3807 1624';
const PHONE_TEL = '+442038071624';
const CAL_URL = 'https://cal.com/dissensus/15min';
const FORM_URL = 'https://formspree.io/f/mreezoko';

const PATREON_URL = 'https://www.patreon.com/cw/dissensus';

// Three columns with real breathing room. The old footer was two flex blocks with inline
// styles, and at full-screen width the link list and the legal block collided into a
// cramped strip at the bottom of every page. Columns collapse to one below 62rem.
function getFooterHtml(prefix = '../') {
  const p = prefix;
  return `<footer class="footer">
<div class="container footer__grid">

<div class="footer__col footer__col--id">
<p class="footer__brand">Dissensus</p>
<p>An independent research group working on complex adaptive systems &mdash; how they hold together when their parts want different things.</p>
<p class="footer__legal">&copy; 2026 Dissensus Ltd &middot; registered in England and Wales, company no. 17309927<br>71-75 Shelton Street, Covent Garden, London WC2H 9JQ</p>
</div>

<nav class="footer__col footer__col--nav" aria-label="Footer">
<span class="footer__k">Site</span>
<a href="${p}index.html">Home</a>
<a href="${p}research.html">Research</a>
<a href="${p}projects.html">Projects</a>
<a href="${p}join.html">Join</a>
<a href="${p}about.html">About</a>
<a href="${p}news.html">News</a>
</nav>

<div class="footer__col footer__col--contact">
<span class="footer__k">Get in touch</span>
<a href="mailto:research@dissensus.ai">research@dissensus.ai</a>
<a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a>
<a href="${CAL_URL}" target="_blank" rel="noopener">Book 15&nbsp;min</a>
<a href="https://asri.dissensus.ai" target="_blank" rel="noopener">ASRI dashboard</a>
<a href="${p}feed.xml" title="RSS Feed">RSS</a>
</div>

</div>

<div class="container footer__base">
${getSocialHtml()}
<p class="footer__meta"><a href="${PATREON_URL}" target="_blank" rel="noopener">Support the research</a><span class="sep">&middot;</span><a href="${p}privacy.html">Privacy</a><span class="sep">&middot;</span><a href="${p}terms.html">Terms</a></p>
</div>
</footer>`;
}

// ─── Generate Paper Page ─────────────────────────────────────────────────────

function generatePaperPage(paper) {
  const authors = paper.authors.join(', ');
  const year = new Date(paper.date).getFullYear();
  // Metadata DOI: prefer a real DOI, fall back to the Zenodo concept DOI for Scholar/DC tags.
  const doi = paper.doi || paper.zenodo || '';
  const pdfUrl = paper.pdf ? `https://dissensus.ai/papers/${paper.pdf}` : '';

  // Identifier action links (rendered in fixed order: arXiv -> DOI -> Zenodo -> SSRN -> PhilPapers -> GitHub -> Dashboard)
  const arxivUrl = paper.arxiv ? `https://arxiv.org/abs/${paper.arxiv}` : '';
  const doiOnlyUrl = paper.doi ? `https://doi.org/${paper.doi}` : '';
  const zenodoUrl = paper.zenodo ? `https://doi.org/${paper.zenodo}` : '';
  const ssrnUrl = paper.ssrn ? `https://papers.ssrn.com/sol3/papers.cfm?abstract_id=${paper.ssrn}` : '';
  const philpapersUrl = paper.philpapers ? `https://philpapers.org/rec/${paper.philpapers}` : '';
  const tags = paper.tags.map(t => tagLabels[t] || t).join(', ');
  const programLabel = programs[paper.program] ? programs[paper.program].title : '';

  // JSON-LD author array
  const authorsSchema = paper.authors.map(a => {
    if (a === 'Murad Farzulla') {
      return `{
          "@type": "Person",
          "name": "${a}",
          "identifier": {
            "@type": "PropertyValue",
            "propertyID": "ORCID",
            "value": "0009-0002-7164-8704"
          },
          "url": "https://orcid.org/0009-0002-7164-8704",
          "affiliation": {
            "@type": "Organization",
            "name": "Dissensus",
            "url": "https://dissensus.ai"
          }
        }`;
    }
    return `{"@type": "Person", "name": "${a}"}`;
  }).join(',\n        ');

  const journalMeta = paper.journal
    ? `    <meta name="citation_journal_title" content="${escapeHtml(paper.journal)}" />`
    : '';
  const reportMeta = paper.wpNumber
    ? `    <meta name="citation_technical_report_number" content="${paper.wpNumber}" />`
    : '';

  const statusClass = `paper-detail__status--${paper.status}`;
  const statusLabel = statusLabels[paper.status] || paper.status;
  const bibtex = generateBibTeX(paper);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(paper.abstract.substring(0, 160))}...">
  <meta name="author" content="${escapeHtml(authors)}">
  <meta name="keywords" content="${escapeHtml(tags)}">
  <meta name="theme-color" content="#faf8f5">
  <meta name="robots" content="index, follow">

  <!-- Highwire Press (Google Scholar) -->
  <meta name="citation_title" content="${escapeHtml(paper.title)}">
  ${paper.authors.map(a => `  <meta name="citation_author" content="${escapeHtml(a)}">`).join('\n  ')}
  <meta name="citation_publication_date" content="${formatCitationDate(paper.date)}">
  ${pdfUrl ? `<meta name="citation_pdf_url" content="${pdfUrl}">` : ''}
  ${doi ? `<meta name="citation_doi" content="${doi}">` : ''}
${journalMeta}
${reportMeta}
  <meta name="citation_publisher" content="Dissensus">
  <meta name="citation_abstract_html_url" content="https://dissensus.ai/papers/${paper.id}.html">
  <meta name="citation_keywords" content="${paper.tags.map(t => tagLabels[t] || t).join('; ')}">
  <meta name="citation_language" content="en">

  <!-- Dublin Core -->
  <meta name="DC.title" content="${escapeHtml(paper.title)}">
  <meta name="DC.creator" content="${escapeHtml(authors)}">
  <meta name="DC.date" content="${paper.date}">
  <meta name="DC.publisher" content="Dissensus">
  <meta name="DC.description" content="${escapeHtml(paper.abstract.substring(0, 300))}...">
  <meta name="DC.type" content="Text">
  <meta name="DC.format" content="text/html">
  <meta name="DC.language" content="en">
  ${doi ? `<meta name="DC.identifier" content="doi:${doi}">` : ''}
  <meta name="DC.rights" content="CC BY 4.0">

  <!-- Schema.org ScholarlyArticle -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "headline": "${jsonLd(paper.title)}",
    "author": [
        ${authorsSchema}
    ],
    "datePublished": "${paper.date}",
    "publisher": {
      "@type": "Organization",
      "name": "Dissensus",
      "url": "https://dissensus.ai"
    },
    "description": "${jsonLd(paper.abstract.replace(/\n/g, ' '))}",
    ${doi ? `"identifier": {"@type": "PropertyValue", "propertyID": "DOI", "value": "${doi}"},` : ''}
    "url": "https://dissensus.ai/papers/${paper.id}",
    "inLanguage": "en"
  }
  </script>

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://dissensus.ai/papers/${paper.id}.html">
  <meta property="og:title" content="${escapeHtml(paper.title)}">
  <meta property="og:description" content="${escapeHtml(paper.abstract.substring(0, 200))}...">
  <meta property="og:site_name" content="Dissensus">
  <meta property="og:image" content="https://dissensus.ai/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(paper.title)}">
  <meta name="twitter:description" content="${escapeHtml(paper.abstract.substring(0, 200))}...">
  <meta name="twitter:image" content="https://dissensus.ai/og-image.png">

  <!-- Canonical -->
  <link rel="canonical" href="https://dissensus.ai/papers/${paper.id}.html">

  <title>${escapeHtml(paper.title)} — Dissensus</title>

  <link rel="stylesheet" href="../css/system.css">
  <link rel="stylesheet" href="../css/site.css">
  <script src="../js/theme.js"></script>
  <script src="../js/motion.js" defer></script>
  <link rel="icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
</head>
<body>

  <div id="progress"></div>

${getNavHtml('research')}

  <main class="container section" style="border-top:0;">
      <a href="../research.html" class="paper__back">&larr; Back to publications</a>

      <header>
        <div class="paper__meta">
          <span>${formatDate(paper.date)}</span>
          <span class="pill ${pillClassForStatus(paper.status)}">${statusLabel}</span>
          ${programLabel ? `<span>${programLabel}</span>` : ''}
        </div>
        <h1 class="paper__title">${paper.title}</h1>
        ${paper.subtitle ? `<p class="paper__subtitle">${paper.subtitle}</p>` : ''}
        <p class="paper__authors">${authors}</p>
      </header>

      <div class="paper__actions">
        ${paper.pdf ? `<a href="${paper.pdf}" class="btn" download>Download PDF</a>` : ''}
        ${arxivUrl ? `<a href="${arxivUrl}" class="btn btn--ghost" target="_blank" rel="noopener">arXiv: ${paper.arxiv}</a>` : ''}
        ${doiOnlyUrl ? `<a href="${doiOnlyUrl}" class="btn btn--ghost" target="_blank" rel="noopener">DOI</a>` : ''}
        ${zenodoUrl ? `<a href="${zenodoUrl}" class="btn btn--ghost" target="_blank" rel="noopener">Zenodo</a>` : ''}
        ${ssrnUrl ? `<a href="${ssrnUrl}" class="btn btn--ghost" target="_blank" rel="noopener">SSRN</a>` : ''}
        ${philpapersUrl ? `<a href="${philpapersUrl}" class="btn btn--ghost" target="_blank" rel="noopener">PhilPapers</a>` : ''}
        ${paper.github ? `<a href="${paper.github}" class="btn btn--ghost" target="_blank" rel="noopener">GitHub</a>` : ''}
        ${paper.dashboard ? `<a href="${paper.dashboard}" class="btn btn--ghost" target="_blank" rel="noopener">Dashboard</a>` : ''}
      </div>

      <section class="paper__section paper__abstract">
        <h2>Abstract</h2>
        <p>${paper.abstract}</p>
      </section>

      <section class="paper__section">
        <h2>Suggested citation</h2>
        <div class="paper__cite">
          ${authors} (${year}). <em>${paper.title}</em>. Dissensus${paper.wpNumber ? ` ${paper.wpNumber.startsWith('DP') ? 'Discussion' : 'Working'} Paper ${paper.wpNumber}` : ''}. ${doi ? `DOI: ${doi}` : ''}
        </div>
        <button class="mini-btn" onclick="copyBibTeX(this)">&#x27E8;/&#x27E9; Copy BibTeX</button>
      </section>

      ${paper.methods && paper.methods.length > 0 ? `<section class="paper__section">
        <h2>Methodology</h2>
        <div class="taglist">
          ${paper.methods.map(m => `<span class="tag">${m}</span>`).join('\n          ')}
        </div>
      </section>` : ''}

      <section class="paper__section">
        <h2>Topics</h2>
        <div class="taglist">
          ${paper.tags.map(t => `<span class="tag">${tagLabels[t] || t}</span>`).join('\n          ')}
        </div>
      </section>
  </main>

${getFooterHtml()}

  <script>
    function copyBibTeX(btn) {
      var bibtex = ${JSON.stringify(bibtex)};
      navigator.clipboard.writeText(bibtex).then(function() {
        var original = btn.innerHTML;
        btn.innerHTML = '\\u2713 Copied';
        setTimeout(function() {
          btn.innerHTML = original;
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

// ─── Regenerate research.html publication list from papers.json ───────────────

// Still used by the per-paper pages, which keep their status pill.
function pillClassForStatus(status) {
  if (status === 'accepted' || status === 'forthcoming') return 'pill--review';
  if (status === 'under-review') return 'pill--review';
  return 'pill--preprint';
}

// Papers that are also open to collaborators point at their Projects entry rather than
// repeating the dossier. Research shows the artefact; Projects shows the open work.
const PAPER_TO_PROJECT = {
  'semantic-first-vision': 'semantic-vision',
  'autonomous-red-team': 'autonomous-red-team',
  'genre-mimicry': 'genre-mimicry',
  'consensual-sovereignty': 'consensual-sovereignty',
};

function projectIdFor(paperId) {
  const pid = PAPER_TO_PROJECT[paperId] || paperId;
  const list = (projectsData && projectsData.projects) || [];
  return list.some(pr => pr.id === pid) ? pid : null;
}

// Compact inline tool row: a tool belongs to the paper it came out of, so it renders
// under that paper instead of in a separate catalogue.
function inlineToolHtml(tool) {
  const bits = [];
  if (tool.dashboard) bits.push(`<a href="${tool.dashboard}" target="_blank" rel="noopener">Dashboard</a>`);
  if (tool.pypi) bits.push(`<a href="https://pypi.org/project/${tool.pypi}/" target="_blank" rel="noopener">PyPI</a>`);
  if (tool.zenodo) bits.push(`<a href="https://doi.org/${tool.zenodo}" target="_blank" rel="noopener">DOI</a>`);
  if (tool.github) bits.push(`<a href="${tool.github}" target="_blank" rel="noopener">GitHub</a>`);
  if (tool.docs) bits.push(`<a href="${tool.docs}" target="_blank" rel="noopener">Docs</a>`);
  const install = tool.install ? `          <code class="pubtool__install">${tool.install}</code>\n` : '';
  const links = bits.length ? `          <div class="pubtool__links">${bits.join('<span class="sep">&middot;</span>')}</div>\n` : '';
  const ver = tool.version ? ` <span class="pubtool__ver">v${tool.version}</span>` : '';
  return `        <div class="pubtool">
          <span class="pubtool__k">${tool.kind || 'Tool'}${tool.status === 'live' ? ' &middot; live' : ''}</span>
          <span class="pubtool__name">${tool.name}${ver}</span>
          <p class="pubtool__desc">${tool.tagline || ''}</p>
${install}${links}        </div>`;
}

function paperRowLinks(paper) {
  const bits = [];
  if (paper.arxiv) bits.push(`<a href="https://arxiv.org/abs/${paper.arxiv}" target="_blank" rel="noopener">arXiv</a>`);
  if (paper.doi) bits.push(`<a href="https://doi.org/${paper.doi}" target="_blank" rel="noopener">DOI</a>`);
  else if (paper.zenodo) bits.push(`<a href="https://doi.org/${paper.zenodo}" target="_blank" rel="noopener">Zenodo</a>`);
  if (paper.ssrn) bits.push(`<a href="${/^https?:/.test(paper.ssrn) ? paper.ssrn : 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=' + paper.ssrn}" target="_blank" rel="noopener">SSRN</a>`);
  if (paper.github) bits.push(`<a href="${paper.github}" target="_blank" rel="noopener">Code</a>`);
  if (paper.dashboard) bits.push(`<a href="${paper.dashboard}" target="_blank" rel="noopener">Dashboard</a>`);
  const proj = projectIdFor(paper.id);
  if (proj) bits.push(`<a href="projects.html#${proj}" class="pubrow__open">Open to collaborators &rarr;</a>`);
  return bits.length ? `          <div class="pubrow__links">${bits.join('<span class="sep">&middot;</span>')}</div>\n` : '';
}

// Linear list, grouped by stage. Replaced a five-category grid of boxed cards: on an
// archive the reader wants to know how finished a thing is, not which of five internal
// categories it was filed under, and a card grid makes twenty items read as twenty
// equal-weight products.
function generateResearchPublications() {
  const stages = papersData.stages || {};
  const blurbs = papersData.stageBlurbs || {};
  const order = papersData.stageOrder || Object.keys(stages);
  const tools = (toolsData && toolsData.tools) || [];

  // A tool linked to several papers (FarzullaProofs covers two) must not print its block
  // once per paper — it rendered twice in a row under the Current focus group. Each tool
  // appears once, under the first paper it attaches to.
  const shownTools = new Set();

  let out = '';
  order.forEach((stage, i) => {
    const items = papers.filter(p => p.stage === stage);
    if (!items.length) return;
    out += `    <div class="stagegroup" id="${stage}">\n`;
    out += `      <h3 class="stagegroup__h"><span class="stagegroup__n">${String(i + 1).padStart(2, '0')}</span> ${stages[stage] || stage} <span class="stagegroup__c">${items.length}</span></h3>\n`;
    if (blurbs[stage]) out += `      <p class="stagegroup__blurb">${blurbs[stage]}</p>\n`;

    items.forEach(paper => {
      const meta = paper.status === 'accepted' && paper.journal
        ? `Accepted &middot; ${paper.journal}`
        : paper.status === 'under-review' && paper.journal
          ? `Under review &middot; ${paper.journal}`
          : paper.arxiv ? `arXiv:${paper.arxiv}` : '';
      const attached = tools.filter(t =>
        (t.relatedPapers || []).includes(paper.id) && !shownTools.has(t.id));
      attached.forEach(t => shownTools.add(t.id));
      out += `      <article class="pubrow" data-reveal>\n`;
      if (meta) out += `        <span class="pubrow__meta">${meta}</span>\n`;
      out += `        <h4><a href="papers/${paper.id}.html">${paper.title}</a></h4>\n`;
      if (paper.subtitle) out += `        <p class="pubrow__sub">${paper.subtitle}</p>\n`;
      out += paperRowLinks(paper).replace(/^ {10}/gm, '        ');
      if (attached.length) out += attached.map(inlineToolHtml).join('\n') + '\n';
      out += `      </article>\n`;
    });
    out += `    </div>\n\n`;
  });

  // Any tool not attached to a paper still needs somewhere to live.
  const orphanTools = tools.filter(t => !(t.relatedPapers || []).length);
  if (orphanTools.length) {
    out += `    <div class="stagegroup" id="standalone-tools">\n`;
    out += `      <h3 class="stagegroup__h"><span class="stagegroup__n">${String(order.length + 1).padStart(2, '0')}</span> Standalone software <span class="stagegroup__c">${orphanTools.length}</span></h3>\n`;
    out += `      <p class="stagegroup__blurb">Tools that are not tied to a single paper.</p>\n`;
    out += orphanTools.map(t => `      <article class="pubrow" data-reveal>\n${inlineToolHtml(t)}\n      </article>`).join('\n') + '\n';
    out += `    </div>\n\n`;
  }
  return out;
}

function updateResearchPage() {
  const file = path.join('public', 'research.html');
  if (!fs.existsSync(file)) {
    console.log('  (research.html not found — skipped)');
    return;
  }
  let html = fs.readFileSync(file, 'utf8');
  const block = generateResearchPublications();
  // Marker-delimited, not heading-anchored. The previous version keyed off the literal
  // `<h2>Publications</h2>` and silently skipped the whole list the moment that heading
  // was reworded — which is exactly what happened when the page was retitled.
  const re = /(<!-- PUBLICATIONS:START[\s\S]*?-->)[\s\S]*?(<!-- PUBLICATIONS:END -->)/;
  if (!re.test(html)) {
    console.log('  ! research.html has no PUBLICATIONS markers — list NOT written');
    return;
  }
  // Replacement FUNCTION, not a string: `block` is built from paper titles and abstracts,
  // and a literal $& / $` / $1 in any of them would be read as a replacement pattern.
  html = html.replace(re, (_m, head, tail) => `${head}\n${block.replace(/\s+$/, '')}\n\n    ${tail}`);

  fs.writeFileSync(file, html);
  const nTools = (toolsData && toolsData.tools || []).length;
  console.log(`  research.html (${papers.length} papers in ${(papersData.stageOrder||[]).length} stages, ${nTools} tools inline)`);
}

// ─── Generate Tools / Packages page (data-driven from tools.json) ─────────────

function projectStatePills(project) {
  const bits = [];
  if (project.publicStatus) bits.push(project.publicStatus);
  if (project.stage) bits.push(project.stage);
  return bits.join(' &middot; ');
}

function generateProjectCard(project, i) {
  const exists = (project.whatExists || []).length
    ? `        <span class="proj__k">What exists</span>
        <ul class="tool__features">
          ${project.whatExists.map(x => `<li>${x}</li>`).join('\n          ')}
        </ul>\n`
    : '';
  const missing = (project.whatIsMissing || []).length
    ? `        <span class="proj__k">What is missing</span>
        <ul class="proj__gaps">
          ${project.whatIsMissing.map(x => `<li>${x}</li>`).join('\n          ')}
        </ul>\n`
    : '';
  const links = (project.links || []).length
    ? `        <div class="projrow__links">${project.links.map(l => `<a href="${l.href}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${l.label}</a>`).join('<span class="sep">&middot;</span>')}</div>\n`
    : '';

  return `      <article class="projrow" id="${project.id}" data-reveal>
        <div class="projrow__head">
          <span class="projrow__n">${String(i + 1).padStart(2, '0')}</span>
          <span class="projrow__domain">${project.domain || ''}</span>
          <span class="pill">${project.publicStatus || 'Early'}</span>
        </div>
        <h3>${project.title}</h3>
        <p class="projrow__one">${project.oneLine}</p>
        <p class="projrow__state">${project.currentState}</p>
${exists}${missing}        <div class="proj__ask">
          <span class="proj__k">Who would move this</span>
          <p>${project.collaboratorProfile}</p>
        </div>
${links}      </article>`;
}

// Shared <head> + opening body for the generated top-level pages.
function pageHead(title, desc, slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} &mdash; Dissensus</title>
  <meta name="description" content="${desc}">

  <!-- Open Graph -->
  <meta property="og:title" content="${title} &mdash; Dissensus">
  <meta property="og:description" content="${desc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://dissensus.ai/${slug}.html">
  <meta property="og:image" content="https://dissensus.ai/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Dissensus">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} &mdash; Dissensus">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="https://dissensus.ai/og-image.png">

  <link rel="canonical" href="https://dissensus.ai/${slug}.html">
  <meta name="theme-color" content="#faf8f5">
  <link rel="stylesheet" href="css/system.css">
  <link rel="stylesheet" href="css/site.css">
  <script src="js/theme.js"></script>
  <script src="js/motion.js" defer></script>
  <link rel="icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
</head>
<body>

  <div id="progress"></div>
`;
}

function generateProjectsPage() {
  if (!projectsData || !projectsData.projects || !projectsData.projects.length) {
    console.log('  (projects.json absent or empty — projects.html skipped)');
    return;
  }
  const projects = projectsData.projects;

  // Entry tasks are grouped by project so each dossier can advertise its own
  // hour-sized ways in, rather than making the reader hold the join page in mind.
  const tasksByProject = {};
  ((rolesData && rolesData.entryTasks) || []).forEach(t => {
    (tasksByProject[t.project] = tasksByProject[t.project] || []).push(t);
  });

  const cards = projects.map((project, i) => {
    const tasks = tasksByProject[project.id] || [];
    const taskList = tasks.length
      ? `          <span class="proj__k">Ways in</span>
          <ul class="tool__features">
            ${tasks.map(t => `<li>${t.task} &mdash; <b>${t.effort}</b></li>`).join('\n            ')}
          </ul>\n`
      : '';
    return generateProjectCard(project, i).replace(
      '          <div class="proj__ask">',
      `${taskList}          <div class="proj__ask">`
    );
  }).join('\n\n');

  const html = `${pageHead('Open projects', 'Six research projects at Dissensus published with their actual state visible — what exists, what is missing, and the hour-sized tasks that would move each one.', 'projects')}
${getNavHtml('projects', '')}

  <header class="container hero hero--editorial" style="padding-block: clamp(3rem, 8vw, 6rem);">
    <span class="kicker">Open projects</span>
    <h1>Where each project actually stands.</h1>
    <p class="lead">${projectsData.intro || ''}</p>
    <p class="lead" style="margin-top: var(--sp-4);">${projectsData.introSecond || ''}</p>
    <div class="cta-row" style="margin-top:1.5rem;">
      <a class="btn" href="join.html">How to join &rarr;</a>
      <a class="btn btn--ghost" href="join.html#start">Tasks by size</a>
    </div>
  </header>

  <section class="section container" id="open-work">
    <span class="index">01 &middot; The records</span>
    <h2>What exists, and what is missing</h2>
    <p class="body-text">${projectsData.stateNote || ''}</p>
    <div class="projlist">

${cards}

    </div>
  </section>

  <section class="section container">
    <span class="index">02 &middot; Terms</span>
    <h2>What collaboration means here</h2>
    <div class="prose" style="max-width: var(--measure);">
      ${(projectsData.terms || []).map(t => `<p>${t}</p>`).join('\n      ')}
    </div>
    <div class="cta-row" style="margin-top: var(--sp-8);">
      <a class="btn" href="join.html#propose">Propose something &rarr;</a>
      <a class="btn btn--ghost" href="mailto:research@dissensus.ai">research@dissensus.ai</a>
    </div>
  </section>

${getFooterHtml('')}

</body>
</html>`;

  fs.writeFileSync(path.join('public', 'projects.html'), html);
  console.log(`  projects.html (${projects.length} open projects)`);
}

// ─── Advisory section ─────────────────────────────────────────────────────────

// Returns '' while advisors.json carries no names, so an empty file publishes
// nothing at all — no placeholder, no "coming soon", and no chance of a
// fabricated name reaching a public page. Flip showWhileEmpty in advisors.json
// to publish the bounded ask before the first name lands.
function generateAdvisorySection(index) {
  if (!advisorsData) return '';
  const advisors = advisorsData.advisors || [];
  if (!advisors.length && !advisorsData.showWhileEmpty) return '';

  const people = advisors.map(a => {
    const initials = a.initials
      || (a.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const links = (a.links || []).length
      ? `            <div class="person__links">
              ${(a.links || []).map(l => `<a href="${l.href}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${l.label}</a>`).join('\n              ')}
            </div>\n`
      : '';
    return `        <div class="person" data-reveal>
          <div class="person__avatar">${initials}</div>
          <div>
            <span class="person__role">${a.role || 'Advisor'}</span>
            <h3>${a.name}</h3>
            ${a.affiliation ? `<p class="status-line">${a.affiliation}</p>` : ''}
            ${a.bio ? `<p>${a.bio}</p>` : ''}
${links}          </div>
        </div>`;
  }).join('\n\n');

  const roster = advisors.length
    ? `    <div style="margin-top: var(--sp-8);">
${people}
    </div>`
    : '';

  return `
  <section class="section container" id="advisory">
    <span class="index">${index} &middot; Advisory</span>
    <h2>Senior advisors</h2>
    <p class="body-text">${advisorsData.intro || ''}</p>
    <p class="body-text" style="margin-top: var(--sp-4);">${advisorsData.askSummary || ''}</p>
    <ul class="plainlist">
      ${(advisorsData.ask || []).map(a => `<li>${a}</li>`).join('\n      ')}
    </ul>
${roster}
    <p class="research-note">${advisorsData.invitationNote || ''}</p>
  </section>
`;
}

// ─── Join page (roles ladder + hour-sized entry tasks) ────────────────────────

function generateJoinPage() {
  if (!rolesData) {
    console.log('  (roles.json absent — join.html skipped)');
    return;
  }
  const projects = (projectsData && projectsData.projects) || [];
  const projectTitle = id => (projects.find(p => p.id === id) || {}).title || id;

  const tiers = (rolesData.tiers || []).map(t => `      <article class="rung" id="${t.id}" data-reveal>
        <div class="rung__head">
          <span class="rung__n">${t.index}</span>
          <h3>${t.title}</h3>
          <span class="pill">${t.openings}</span>
        </div>
        <span class="rung__commit">${t.commitment}</span>
        <p class="rung__what">${t.whatItIs}</p>
        <div class="rung__get">
          <span class="proj__k">What you get</span>
          <ul class="tool__features">
            ${(t.whatYouGet || []).map(g => `<li>${g}</li>`).join('\n            ')}
          </ul>
        </div>
        <p class="rung__enter"><span class="proj__k">How to enter</span>${t.howToEnter}</p>
      </article>`).join('\n\n');

  const tasks = (rolesData.entryTasks || []).map(t => `      <li class="task" id="${t.id}" data-reveal>
        <div class="task__effort"><span>Effort</span>${t.effort}</div>
        <div class="task__body">
          <h3>${t.task}</h3>
          <p>${t.output}</p>
          ${t.note ? `<p class="task__note">${t.note}</p>` : ''}
          <div class="task__meta">
            <span>Fits: ${t.whoFits}</span>
            <a href="projects.html#${t.project}" title="${projectTitle(t.project)}">${t.projectShort} &rarr;</a>
          </div>
        </div>
      </li>`).join('\n\n');

  const advisory = generateAdvisorySection('06');

  const html = `${pageHead('Join', 'Dissensus is a new research lab still taking shape. Research roles from a weekend task to a standing affiliation, the hour-sized ways in, and a plain account of the limits.', 'join')}
${getNavHtml('join', '')}

  <header class="container hero hero--editorial" style="padding-block: clamp(3rem, 8vw, 6rem);">
    <span class="kicker">Join</span>
    <h1>A new lab, still deciding what it is.</h1>
    <p class="lead">${rolesData.intro || ''}</p>
    <div class="cta-row" style="margin-top:1.5rem;">
      <a class="btn" href="#start">Start with one task &rarr;</a>
      <a class="btn btn--ghost" href="https://discord.gg/5VtRcb45N7" target="_blank" rel="noopener">Join the Discord</a>
    </div>
  </header>

  <section class="section container" id="roles">
    <span class="index">01 &middot; Roles</span>
    <h2>Three rungs, each entered by doing the previous one</h2>
    <p class="body-text">${rolesData.introSecond || ''}</p>
    <div class="runglist">

${tiers}

    </div>
  </section>

  <section class="section container" id="start">
    <span class="index">02 &middot; Start here</span>
    <h2>Tasks, listed at the size they actually are</h2>
    <p class="body-text">${rolesData.startHere || ''}</p>
    <ul class="tasks">

${tasks}

    </ul>
  </section>

  <section class="section container" id="not-offering">
    <span class="index">03 &middot; The limits</span>
    <h2>What the lab cannot offer</h2>
    <p class="body-text">Up front, because finding it out later wastes more of your time than reading it now. Some of these are constraints that change with funding; the rest are choices, and they are marked.</p>
    <ul class="plainlist">
      ${(rolesData.notOffering || []).map(n => `<li>${n}</li>`).join('\n      ')}
    </ul>
  </section>

  <section class="section container" id="organisations">
    <span class="index">04 &middot; Organisations</span>
    <h2>Applied work and partnership</h2>
    <p class="body-text">Commercial engagements are the one place money changes hands, and they are deliberately separate from everything above: a client owns the deliverable, whereas funding the programme produces public goods. For friction analysis, systemic-risk indices, formal verification in Lean 4, or adversarial evaluation of multi-agent systems, email <a href="mailto:research@dissensus.ai">research@dissensus.ai</a> with the problem as you currently understand it, or <a href="https://cal.com/dissensus/15min" target="_blank" rel="noopener">book fifteen minutes</a>. If we are not the right lab, we will say so.</p>
    <p class="body-text">Partnership does not have to mean money. If your group, lab, reading circle, student society or journal is working on questions that overlap ours &mdash; coordination and its overhead, alignment under competing objectives, legitimacy and consent, systemic risk, or the methodology of checking any of it &mdash; the useful move is usually the small one: a joint reading, a shared dataset, a reciprocal review where each side tries to break the other&rsquo;s result, a co-authored piece, or simply naming each other as places to send people. Dissensus already runs one such arrangement with the Sineidocracia movement, where the lab supplies technical infrastructure and gets a genuinely different intellectual tradition to argue with. We are looking for more of those, including with groups whose conclusions we expect to disagree with &mdash; that is closer to the point than agreement is.</p>
    <p class="body-text">The lab is also looking for <b>external oversight</b>: people or bodies willing to audit its methods, sit in an advisory capacity, or check results it has a stake in believing. That is not a formality. A lab which only ever hears from people who agree with it is not being reviewed, and this one has already had to retract a result that survived its own internal scrutiny for months. Current partnerships and acknowledgements are listed <a href="/about#partnerships">on the About page</a>.</p>
    <div class="cta-row" style="margin-top: var(--sp-6);">
      <a class="btn" href="https://cal.com/dissensus/15min" target="_blank" rel="noopener">Book 15&nbsp;min</a>
      <a class="btn btn--ghost" href="mailto:research@dissensus.ai?subject=Collaboration%20between%20groups">Email the lab</a>
      <a class="btn btn--ghost" href="tel:+442038071624">020 3807 1624</a>
    </div>
  </section>

  <section class="section container" id="discord">
    <span class="index">05 &middot; Discord</span>
    <h2>Or just come and talk first</h2>
    <p class="body-text">Not every useful conversation should have to start with an email and a proposal. The lab runs an open Discord where the papers get argued about before they are finished, drafts go up for people to pick holes in, and open problems sit in a channel rather than in someone&rsquo;s head. Joining commits you to nothing and there is no application &mdash; lurking is a legitimate use of it, and several of the tasks above were first raised there by people who had no formal role at all.</p>
    <div class="cta-row" style="margin-top: var(--sp-6);">
      <a class="btn" href="https://discord.gg/5VtRcb45N7" target="_blank" rel="noopener">Join the Discord &rarr;</a>
    </div>
  </section>
${advisory}
  <section class="section container" id="propose">
    <span class="index">${advisory ? '07' : '06'} &middot; Get in touch</span>
    <h2>Propose something</h2>
    <p class="lead">${rolesData.contactNote || ''}</p>
    <form class="form" style="margin-top: 2.4rem;" action="https://formspree.io/f/mreezoko" method="POST">
      <input type="hidden" name="_subject" value="Join enquiry — dissensus.ai/join">
      <div class="form__row">
        <label>Your name
          <input type="text" name="name" required>
        </label>
        <label>Email
          <input type="email" name="email" required>
        </label>
      </div>
      <label>Affiliation <span class="form__hint">(optional &mdash; independent is fine)</span>
        <input type="text" name="affiliation">
      </label>
      <label>What you are responding to
        <select name="interest">
          <option value="">&mdash; select &mdash;</option>
${(rolesData.entryTasks || []).map(t => `          <option value="${t.id}">Task: ${t.task}</option>`).join('\n')}
${projects.map(p => `          <option value="project-${p.id}">Project: ${p.title}</option>`).join('\n')}
          <option value="affiliate">An ongoing research role</option>
          <option value="organisation">Applied work / partnership</option>
          <option value="other">Something else entirely</option>
        </select>
      </label>
      <label>What you would bring, and what you would want out of it
        <textarea name="message" required placeholder="Concrete is better than enthusiastic. Data you have access to, a method you know, a criticism you think is fatal."></textarea>
      </label>
      <button type="submit" class="btn">Send</button>
    </form>
  </section>

${getFooterHtml('')}

</body>
</html>`;

  fs.writeFileSync(path.join('public', 'join.html'), html);
  const nTiers = (rolesData.tiers || []).length;
  const nTasks = (rolesData.entryTasks || []).length;
  const nAdv = ((advisorsData && advisorsData.advisors) || []).length;
  console.log(`  join.html (${nTiers} tiers, ${nTasks} entry tasks, advisory: ${nAdv ? nAdv + ' listed' : 'empty — section omitted'})`);
}

// ─── Featured open tasks on the homepage ─────────────────────────────────────

// The homepage's Contribute section shows three concrete tasks so the recruiting ask
// is on the front door rather than described there. They come from roles.json
// (entryTasks where featured:true) between the OPEN-TASKS markers, so the front page
// cannot drift from the Join page — the previous homepage listed research directions
// that appeared nowhere else on the site.
function syncHomeTasks() {
  const file = path.join('public', 'index.html');
  if (!rolesData || !fs.existsSync(file)) return;

  const featured = (rolesData.entryTasks || []).filter(t => t.featured);
  if (!featured.length) { console.log('  (no featured tasks in roles.json — homepage block left empty)'); return; }

  const cards = featured.map(t => `          <a class="opentask" href="join.html#${t.id}" data-reveal>
            <span class="opentask__effort">${t.effort}</span>
            <span class="opentask__task">${t.task}</span>
            <span class="opentask__who">${t.whoFits}</span>
          </a>`).join('\n');

  const block = `        <div class="opentasks">
${cards}
        </div>`;

  const re = /(<!-- OPEN-TASKS:START[\s\S]*?-->)[\s\S]*?(<!-- OPEN-TASKS:END -->)/;
  const html = fs.readFileSync(file, 'utf8');
  if (!re.test(html)) { console.log('  ! index.html has no OPEN-TASKS markers — skipped'); return; }
  fs.writeFileSync(file, html.replace(re, `$1\n${block}\n        $2`));
  console.log(`  index.html open-tasks block (${featured.length} featured)`);
}

// ─── Sync nav + footer into hand-authored pages ──────────────────────────────

// The hand-authored pages own their CONTENT but not their chrome. Both blocks are
// rewritten from getNavHtml()/getFooterHtml() on every build, so adding a route
// updates every page at once. Before this existed, adding Collaborate to the nav
// reached only the three generated page types — the homepage had no link to it at
// all, which made a freshly shipped page unreachable from the front door.
function syncStaticChrome() {
  // [file, activeKey, prefix] — prefix '' for root pages, '../' one level down.
  const pages = [
    ['index.html', 'home', ''],
    ['about.html', 'about', ''],
    ['research.html', 'research', ''],
    ['news.html', 'news', ''],
    // manifesto / charter / reading / press / subscribe were retired in Aug 2026.
    // The files are deleted and _redirects sends their URLs elsewhere, so they are
    // deliberately absent here rather than listed and skipped.
    ['privacy.html', null, ''],
    ['terms.html', null, ''],
    ['404.html', null, ''],
    ['news/incorporation.html', 'news', '../'],
    ['news/temporal-bitmap.html', 'news', '../'],
    ['news/trident.html', 'news', '../'],
    ['news/digital-finance-accept.html', 'news', '../'],
  ];

  const navRe = /<nav class="nav">[\s\S]*?<\/nav>/;
  const footRe = /<footer class="footer">[\s\S]*?<\/footer>/;
  let navs = 0, foots = 0;
  const skipped = [];

  pages.forEach(([file, active, prefix]) => {
    const p = path.join('public', file);
    if (!fs.existsSync(p)) { skipped.push(`${file} (missing)`); return; }
    let html = fs.readFileSync(p, 'utf8');

    if (navRe.test(html)) {
      html = html.replace(navRe, () => getNavHtml(active, prefix).replace(/^\s*/, ''));
      navs++;
    } else {
      skipped.push(`${file} (no nav block)`);
    }

    if (footRe.test(html)) {
      html = html.replace(footRe, () => getFooterHtml(prefix).replace(/^\s*/, ''));
      foots++;
    } else {
      skipped.push(`${file} (no footer block)`);
    }

    fs.writeFileSync(p, html);
  });

  console.log(`  nav synced in ${navs}, footer synced in ${foots} of ${pages.length} pages`);
  skipped.forEach(s => console.log(`  ! skipped: ${s}`));
}

// ─── Canonicalise self-referencing URLs ──────────────────────────────────────

// The host 307-redirects every /x.html to /x, so a canonical, og:url or
// citation_abstract_html_url written as .html points at a redirect rather than the
// 200 it should name. Rewrites those metadata fields, sitemap <loc>, feed <link>,
// and internal navigation hrefs. citation_pdf_url is left alone — it names a real
// .pdf, which does not redirect, and Google Scholar has to be able to fetch it.
//
// Nav hrefs used to be left alone on the grounds that relative .html links "are fine".
// They resolve, but every one is a 307 hop, and Search Console showed the bill: Google
// discovered the .html twin of each page by following them and filed 13 of them as
// "alternate page with proper canonical tag". Links now name the 200 directly.
function canonicaliseUrls() {
  const strip = url => url
    .replace(/^(https:\/\/dissensus\.ai\/[^"']*?)index\.html$/, '$1')
    .replace(/^(https:\/\/dissensus\.ai\/[^"']*?)\.html$/, '$1');

  // Resolve an internal href against the page holding it and return an absolute,
  // extensionless path. Returns null for anything that must not be touched.
  const toAbsolute = (href, fileRelDir) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;   // http:, mailto:, tel:
    if (href.startsWith('//') || href.startsWith('#')) return null;
    const [rawPath, frag = ''] = href.split('#');
    if (!/\.html$/.test(rawPath)) return null;             // .pdf, .xml, .css, assets
    const base = href.startsWith('/')
      ? rawPath.replace(/^\//, '')
      : path.posix.join(fileRelDir, rawPath);
    let out = path.posix.normalize(base);
    if (out.startsWith('..')) return null;                 // escapes public/, leave it
    out = out.replace(/index\.html$/, '').replace(/\.html$/, '');
    out = '/' + out.replace(/\/$/, '');
    if (out === '/') out = '/';
    return out + (frag ? '#' + frag : '');
  };

  const FIELDS = [
    /(<link rel="canonical" href=")([^"]+)(")/g,
    /(<meta property="og:url" content=")([^"]+)(")/g,
    /(<meta name="citation_abstract_html_url" content=")([^"]+)(")/g,
  ];

  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (e.name.endsWith('.html') ? [p] : []);
  });

  let touched = 0;
  let hrefs = 0;
  for (const file of walk('public')) {
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    for (const re of FIELDS) {
      after = after.replace(re, (_m, head, url, tail) => `${head}${strip(url)}${tail}`);
    }
    const relDir = path.posix.dirname(path.relative('public', file).split(path.sep).join('/'));
    after = after.replace(/(<a\b[^>]*\bhref=")([^"]+)(")/g, (m, head, href, tail) => {
      const abs = toAbsolute(href, relDir === '.' ? '' : relDir);
      if (!abs) return m;
      hrefs++;
      return `${head}${abs}${tail}`;
    });
    if (after !== before) { fs.writeFileSync(file, after); touched++; }
  }

  const smPath = path.join('public', 'sitemap.xml');
  let smFixed = 0;
  if (fs.existsSync(smPath)) {
    const before = fs.readFileSync(smPath, 'utf8');
    const after = before.replace(/(<loc>)([^<]+)(<\/loc>)/g,
      (_m, head, url, tail) => { const s = strip(url); if (s !== url) smFixed++; return `${head}${s}${tail}`; });
    if (after !== before) fs.writeFileSync(smPath, after);
  }

  // The feed advertised the .html twin of every item, which is a second way for a
  // redirecting URL to enter an index.
  const feedPath = path.join('public', 'feed.xml');
  let feedFixed = 0;
  if (fs.existsSync(feedPath)) {
    const before = fs.readFileSync(feedPath, 'utf8');
    const after = before.replace(/(<link>|<guid[^>]*>)([^<]+)(<\/link>|<\/guid>)/g,
      (_m, head, url, tail) => { const s = strip(url); if (s !== url) feedFixed++; return `${head}${s}${tail}`; });
    if (after !== before) fs.writeFileSync(feedPath, after);
  }

  console.log(`  canonical/og:url stripped of .html in ${touched} pages, ${smFixed} sitemap URLs, ${feedFixed} feed URLs`);
  console.log(`  internal nav hrefs rewritten to extensionless absolute paths: ${hrefs}`);
}

// ─── Cache-bust stylesheets ──────────────────────────────────────────────────

// Every stylesheet was linked bare (`css/site.css`), so a CSS change reached only
// first-time visitors — returning ones kept the cached copy until it expired on its
// own. One hash over all three sheets, appended to every reference in every page,
// generated or hand-authored. Runs LAST so it covers pages written earlier in the build.
function bustCss() {
  const sheets = ['system.css', 'site.css', 'index.css']
    .map(n => path.join('public', 'css', n))
    .filter(p => fs.existsSync(p));
  if (!sheets.length) { console.log('  (no stylesheets found — skipped)'); return; }

  const h = crypto.createHash('md5');
  sheets.forEach(p => h.update(fs.readFileSync(p)));
  const hash = h.digest('hex').slice(0, 8);

  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (e.name.endsWith('.html') ? [p] : []);
  });

  let touched = 0;
  for (const file of walk('public')) {
    const before = fs.readFileSync(file, 'utf8');
    // Matches css/x.css and ../css/x.css, with or without an existing ?v=
    const after = before.replace(
      /((?:\.\.\/)?css\/(?:system|site|index)\.css)(\?v=[a-f0-9]*)?/g,
      (_m, base) => `${base}?v=${hash}`
    );
    if (after !== before) { fs.writeFileSync(file, after); touched++; }
  }
  console.log(`  css v=${hash} applied to ${touched} pages (${sheets.length} stylesheets hashed)`);
}

// ─── Generate Sitemap ────────────────────────────────────────────────────────

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  // Static pages (services/partners are redirect stubs — omitted)
  const staticPages = [
    { loc: 'https://dissensus.ai/', priority: '1.0', changefreq: 'weekly' },
    { loc: 'https://dissensus.ai/research.html', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://dissensus.ai/news.html', priority: '0.8', changefreq: 'weekly' },
    // Recruiting surfaces rank above the catalogue pages: join.html is the one page
    // the lab actually needs found. The retired pages (manifesto, charter, reading,
    // press, subscribe) are gone from here — a sitemap advertising a 301 is worse
    // than no entry, and they were listed for three weeks after being redirected.
    ...(rolesData ? [{ loc: 'https://dissensus.ai/join.html', priority: '0.8', changefreq: 'monthly' }] : []),
    ...(projectsData ? [{ loc: 'https://dissensus.ai/projects.html', priority: '0.7', changefreq: 'monthly' }] : []),
    { loc: 'https://dissensus.ai/about.html', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/privacy.html', priority: '0.3', changefreq: 'yearly' },
    { loc: 'https://dissensus.ai/terms.html', priority: '0.3', changefreq: 'yearly' },
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  staticPages.forEach(page => {
    sitemap += `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  // News posts — everything in public/news/ except _drafts
  const newsDir = path.join('public', 'news');
  if (fs.existsSync(newsDir)) {
    fs.readdirSync(newsDir).filter(f => f.endsWith('.html')).sort().forEach(f => {
      sitemap += `  <url>
    <loc>https://dissensus.ai/news/${f}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });
  }

  // Paper pages — sorted by date, peer-review gets higher priority
  const sorted = [...papers].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(paper => {
    const priority = (paper.status === 'peer-review' || paper.status === 'published') ? '0.9' : '0.8';
    sitemap += `  <url>
    <loc>https://dissensus.ai/papers/${paper.id}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>
`;
  });

  sitemap += `</urlset>
`;

  fs.writeFileSync(path.join('public', 'sitemap.xml'), sitemap);
  console.log(`  sitemap.xml (${staticPages.length + papers.length} URLs)`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('Dissensus — Paper Page Generator');
console.log('───────────────────────────────────');

// Ensure output directory exists
const outDir = path.join('public', 'papers');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate paper pages
console.log('\nPaper pages:');
papers.forEach(paper => {
  const html = generatePaperPage(paper);
  const filepath = path.join(outDir, `${paper.id}.html`);
  fs.writeFileSync(filepath, html);
  console.log(`  ${paper.id}.html`);
});

// Prune pages for papers no longer in papers.json. Without this, removing a paper
// leaves its page live and Scholar-indexed — unlinked from the site but still served,
// still carrying citation_* metadata, and invisible in any review of papers.json.
// PDFs are left alone: they are referenced by citation_pdf_url in already-indexed
// records, and deleting one breaks a citation rather than retiring a page.
{
  const wanted = new Set(papers.map(p => `${p.id}.html`));
  const orphans = fs.readdirSync(outDir)
    .filter(f => f.endsWith('.html') && !wanted.has(f));
  orphans.forEach(f => fs.unlinkSync(path.join(outDir, f)));
  if (orphans.length) console.log(`  pruned ${orphans.length} orphan page(s): ${orphans.join(', ')}`);
}

// Regenerate research.html publication list from papers.json
console.log('\nResearch page:');
updateResearchPage();

// Generate the open-projects dossiers from projects.json
console.log('\nProjects page:');
generateProjectsPage();

// Generate the roles ladder + entry tasks from roles.json (+ advisors.json)
console.log('\nJoin page:');
generateJoinPage();

// Featured open tasks on the homepage (from roles.json)
console.log('\nHomepage blocks:');
syncHomeTasks();

// Sync nav + footer into the hand-authored pages
console.log('\nChrome sync (hand-authored pages):');
syncStaticChrome();

// Generate sitemap
console.log('\nSitemap:');
generateSitemap();

// Point canonical/og:url at the 200 URL rather than the .html that redirects
console.log('\nCanonical URLs:');
canonicaliseUrls();

// Version every stylesheet reference (must run after every page is written)
console.log('\nCache-busting:');
bustCss();

// Summary
console.log(`\n✓ Generated ${papers.length} paper pages${projectsData ? ' + projects.html' : ''}${rolesData ? ' + join.html' : ''} + sitemap`);
console.log('  Run: python -m http.server 8000 --directory public');
