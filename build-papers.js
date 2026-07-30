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
// Open projects looking for collaborators. Optional — collaborate.html is skipped if absent.
const projectsData = fs.existsSync('projects.json')
  ? JSON.parse(fs.readFileSync('projects.json', 'utf8'))
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
  return `  <nav class="nav">
    <a href="${prefix}index.html" class="nav__brand"><img src="${prefix}assets/dissensus-mark-mono-white.png" alt="" class="nav__brand-mark nav__brand-mark--dark"><img src="${prefix}assets/dissensus-mark-mono-wine.png" alt="" class="nav__brand-mark nav__brand-mark--light"> Dissensus</a>
    <button class="nav__burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu" onclick="toggleNav(this)"><span></span><span></span><span></span></button>
    <div class="nav__links" id="nav-menu">
${item('index.html', 'Home', 'home')}
${item('about.html', 'About', 'about')}
${item('research.html', 'Research', 'research')}
${item('news.html', 'News', 'news')}
${item('tools.html', 'Tools', 'tools')}
${item('collaborate.html', 'Collaborate', 'collaborate')}
      <a href="https://asri.dissensus.ai" target="_blank" rel="noopener">ASRI &#8599;</a>
      <button class="toggle" onclick="toggleTheme()">&#9689; theme</button>
    </div>
  </nav>`;
}

// Social marks are inlined (no CDN, no external fetch — matches the self-hosted-assets rule).
const LINKEDIN_URL = 'https://www.linkedin.com/company/dissensus-ai/';
const GITHUB_ORG_URL = 'https://github.com/dissensus-ai';
const LINKEDIN_ICON_PATH = 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z';
const GITHUB_ICON_PATH = 'M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.83.58A12 12 0 0 0 12 .3z';

function getSocialHtml() {
  return `<p class="footer__social">
<a href="${LINKEDIN_URL}" target="_blank" rel="noopener" aria-label="Dissensus on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${LINKEDIN_ICON_PATH}"/></svg>LinkedIn</a>
<a href="${GITHUB_ORG_URL}" target="_blank" rel="noopener" aria-label="Dissensus on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${GITHUB_ICON_PATH}"/></svg>GitHub</a>
</p>`;
}

function getFooterHtml(prefix = '../') {
  const p = prefix;
  return `<footer class="footer">
<div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1.5rem;">
<div>
<p style="margin-bottom:.4rem;">&copy; 2026 Dissensus Ltd &middot; Friction is the cost of existence.</p>
<p>Registered in England and Wales, company no. 17309927 &middot; Programme: <a href="https://systems.ac" target="_blank" rel="noopener">ASCRI &rarr;</a></p>
${getSocialHtml()}
</div>
<div style="max-width:560px;">
<a href="${p}index.html">Home</a> &middot;
<a href="${p}about.html">About</a> &middot;
<a href="${p}research.html">Research</a> &middot;
<a href="${p}news.html">News</a> &middot;
<a href="${p}tools.html">Tools</a> &middot;
<a href="https://asri.dissensus.ai" target="_blank" rel="noopener">ASRI</a> &middot;
<a href="https://systems.ac" target="_blank" rel="noopener">ASCRI</a> &middot;
<a href="${p}manifesto.html">Manifesto</a> &middot;
<a href="${p}charter.html">Charter</a> &middot;
<a href="${p}reading.html">Reading</a> &middot;
<a href="${p}press.html">Press</a> &middot;
<a href="${p}subscribe.html">Subscribe</a> &middot;
<a href="${p}privacy.html">Privacy</a> &middot;
<a href="${p}terms.html">Terms</a> &middot;
<a href="${p}feed.xml" title="RSS Feed">RSS</a>
</div>
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
          <span class="pill ${paper.status === 'under-review' ? 'pill--review' : 'pill--preprint'}">${statusLabel}</span>
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

function pubItemMeta(paper) {
  if (paper.status === 'under-review' && paper.journal) return `Under review &middot; ${paper.journal}`;
  if (paper.arxiv) return `arXiv: ${paper.arxiv}`;
  return `Preprint`;
}

function pubItemPill(paper) {
  if (paper.status === 'under-review') return `<span class="pill pill--review">Under review</span>`;
  return `<span class="pill pill--preprint">Preprint</span>`;
}

function pubItemDetail(paper) {
  if (paper.subtitle) return paper.subtitle;
  if (paper.methods && paper.methods.length) return paper.methods.slice(0, 3).join(' &middot; ');
  return paper.tags.map(t => tagLabels[t] || t).join(', ');
}

function generateResearchPublications() {
  // Ordered category sections with their descriptive sub-line.
  const categoryOrder = [
    ['governance-dynamics', 'Consent, legitimacy, and multi-agent coordination'],
    ['market-microstructure', 'Risk asymmetry, volatility, and digital asset markets'],
    ['process-philosophy', 'Metaphysics, identity, consciousness, and substrates'],
    ['political-economy', 'Inequality, privacy, and regulatory structures'],
    ['computational-cognition', 'Machine learning, safety, and phenomenology'],
  ];
  const categoryLabels = papersData.categories;

  let out = '';
  categoryOrder.forEach(([cat, blurb]) => {
    const items = papers.filter(p => p.category === cat);
    if (!items.length) return;
    out += `    <div class="pubgroup">\n`;
    out += `      <h3>${categoryLabels[cat] || cat}</h3>\n`;
    out += `      <p class="pubgroup__blurb">${blurb}</p>\n`;
    out += `      <div class="grid">\n`;
    items.forEach(paper => {
      out += `        <a href="papers/${paper.id}.html" class="card">\n`;
      out += `          <span class="card__meta">${pubItemMeta(paper)}</span>\n`;
      out += `          <h3>${paper.title}</h3>\n`;
      out += `          <p>${pubItemDetail(paper)}</p>\n`;
      out += `          ${pubItemPill(paper)}\n`;
      out += `        </a>\n`;
    });
    out += `      </div>\n`;
    out += `    </div>\n\n`;
  });
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
  // Replace everything between the Publications heading and the closing research-note paragraph.
  // The whitespace before <p class="research-note"> is matched but NOT captured, and re-emitted
  // as a fixed string — capturing it made the build non-idempotent, adding two blank lines to
  // research.html on every run, unbounded.
  const re = /(<h2>Publications<\/h2>\n)[\s\S]*?\n[ \t]*(<p class="research-note">)/;
  if (!re.test(html)) {
    console.log('  (research.html publications anchors not found — skipped)');
    return;
  }
  // Replacement FUNCTION, not a string: `block` is generated HTML built from paper titles and
  // abstracts, and a literal $& / $` / $1 in any of them would otherwise be interpreted as a
  // replacement pattern and corrupt the output.
  html = html.replace(re, (_m, head, tail) => `${head}\n${block.replace(/\s+$/, '')}\n\n    ${tail}`);
  fs.writeFileSync(file, html);
  console.log('  research.html (publications list regenerated)');
}

// ─── Generate Tools / Packages page (data-driven from tools.json) ─────────────

function toolsNavHtml() {
  return getNavHtml('tools', '');
}

function toolsFooterHtml() {
  return getFooterHtml('');
}

function toolActionButtons(tool) {
  const btns = [];
  if (tool.dashboard) {
    btns.push(`<a href="${tool.dashboard}" class="btn" target="_blank" rel="noopener">Open dashboard &rarr;</a>`);
  }
  if (tool.pypi) {
    btns.push(`<a href="https://pypi.org/project/${tool.pypi}/" class="btn btn--ghost" target="_blank" rel="noopener">PyPI: ${tool.pypi}</a>`);
  }
  if (tool.arxiv) {
    btns.push(`<a href="https://arxiv.org/abs/${tool.arxiv}" class="btn btn--ghost" target="_blank" rel="noopener">arXiv: ${tool.arxiv}</a>`);
  }
  if (tool.zenodo) {
    btns.push(`<a href="https://doi.org/${tool.zenodo}" class="btn btn--ghost" target="_blank" rel="noopener">DOI</a>`);
  }
  if (tool.github) {
    btns.push(`<a href="${tool.github}" class="btn btn--ghost" target="_blank" rel="noopener">GitHub</a>`);
  }
  if (tool.docs) {
    btns.push(`<a href="${tool.docs}" class="btn btn--ghost" target="_blank" rel="noopener">Docs</a>`);
  }
  (tool.relatedPapers || []).forEach(id => {
    const p = papersById[id];
    if (!p) return;
    btns.push(`<a href="papers/${id}.html" class="btn btn--ghost" title="${escapeHtml(p.title)}">Paper &rarr;</a>`);
  });
  if (!btns.length) return '';
  return `          <div class="btn-row">
            ${btns.join('\n            ')}
          </div>`;
}

function toolIdentifierBadges(tool) {
  const badges = [];
  if (tool.version) badges.push(['Version', `v${tool.version}`]);
  if (tool.zenodo) badges.push(['DOI', tool.zenodo]);
  if (tool.arxiv) badges.push(['arXiv', tool.arxiv]);
  if (!badges.length) return '';
  return `          <div class="badges">
            ${badges.map(([l, v]) => `<span class="badge"><span class="badge__k">${l}</span><span class="badge__v">${v}</span></span>`).join('\n            ')}
          </div>`;
}

function toolMetricBadges(tool) {
  if (!tool.metrics || !tool.metrics.length) return '';
  return `          <div class="badges">
            ${tool.metrics.map(m => `<span class="badge"><span class="badge__k">${m.label}</span><span class="badge__v">${m.value}</span></span>`).join('\n            ')}
          </div>`;
}

function generateToolCard(tool) {
  const statusLabel = (toolsData.toolStatuses && toolsData.toolStatuses[tool.status]) || tool.status;
  const catLabel = (toolsData.toolCategories && toolsData.toolCategories[tool.category]) || null;
  // Category rides on the card now that all tools share one grid — see generateToolsPage().
  const labelBits = [catLabel, tool.kind, tool.version ? `v${tool.version}` : null].filter(Boolean).join(' &middot; ');
  const pillClass = (tool.status === 'live' || tool.status === 'released') ? 'pill pill--review' : 'pill pill--preprint';
  return `        <div class="card">
          <div class="tool__head">
            <span class="card__meta">${labelBits}</span>
            <span class="${pillClass}">${statusLabel}</span>
          </div>
          <h3>${tool.name}</h3>
          <p class="tool__tagline">${tool.tagline}</p>
          <p>${tool.description}</p>
${tool.install ? `          <code class="tool__install">${tool.install}</code>\n` : ''}${tool.features && tool.features.length ? `          <ul class="tool__features">
            ${tool.features.map(f => `<li>${f}</li>`).join('\n            ')}
          </ul>\n` : ''}${toolMetricBadges(tool)}
${toolActionButtons(tool)}
${toolIdentifierBadges(tool)}
        </div>`;
}

function generateToolsPage() {
  if (!toolsData || !toolsData.tools || !toolsData.tools.length) {
    console.log('  (tools.json absent or empty — tools.html skipped)');
    return;
  }
  const cats = toolsData.toolCategories || {};
  const order = toolsData.categoryOrder || Object.keys(cats).map(c => [c, '']);

  // One grid for the whole catalogue rather than a section per category. With only a
  // handful of tools, per-category sections each rendered a single card stranded in a
  // narrow auto-fill track — a tall thin column on a wide screen. Category survives as
  // a card label plus the legend below, and this layout stays correct as tools are added.
  const ordered = [];
  order.forEach(([cat]) => {
    toolsData.tools.filter(t => t.category === cat).forEach(t => ordered.push(t));
  });
  toolsData.tools.forEach(t => { if (!ordered.includes(t)) ordered.push(t); });

  const legend = order
    .filter(([cat]) => toolsData.tools.some(t => t.category === cat))
    .map(([cat, blurb]) => {
      const n = toolsData.tools.filter(t => t.category === cat).length;
      return `      <div class="legend__item">
        <span class="legend__k">${cats[cat] || cat} <span class="legend__n">${n}</span></span>
        ${blurb ? `<span class="legend__v">${blurb}</span>` : ''}
      </div>`;
    })
    .join('\n');

  const sections = `  <section class="section container">
    <span class="index">01 &middot; Catalogue</span>
    <h2>What we maintain</h2>
    <div class="legend">
${legend}
    </div>
    <div class="grid grid--wide" style="margin-top: var(--sp-8);">

${ordered.map(generateToolCard).join('\n\n')}

    </div>
  </section>

`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tools &amp; Packages — Dissensus</title>
  <meta name="description" content="Open-source software packages, indices, and live dashboards from Dissensus, implementing the lab's quantitative methods for friction analysis and systemic risk.">

  <!-- Open Graph -->
  <meta property="og:title" content="Tools &amp; Packages — Dissensus">
  <meta property="og:description" content="Open-source packages and live indices implementing the lab's quantitative methods.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://dissensus.ai/tools.html">
  <meta property="og:image" content="https://dissensus.ai/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Dissensus">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Tools &amp; Packages — Dissensus">
  <meta name="twitter:description" content="Open-source packages and live indices implementing the lab's quantitative methods.">
  <meta name="twitter:image" content="https://dissensus.ai/og-image.png">

  <link rel="canonical" href="https://dissensus.ai/tools.html">
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

${toolsNavHtml()}

  <!-- Hero -->
  <header class="container hero" style="padding-block: clamp(3rem, 8vw, 6rem);">
    <span class="kicker">Tools &amp; Packages</span>
    <h1>Open tooling</h1>
    <p class="lead">Software, indices, and live dashboards that implement the lab's quantitative methods. Everything here is open-access and citable; install commands and DOIs are listed per package.</p>
  </header>

${sections}  <!-- Contribute -->
  <section class="section container">
    <span class="index">02 &middot; Contribute</span>
    <h2>Build with us</h2>
    <p class="lead">These packages are released open-access as the research that produced them is published. If a tool is useful to your work, or broken in an interesting way, we want to hear about it.</p>
    <div class="btn-row">
      <a href="mailto:research@dissensus.ai" class="btn">research@dissensus.ai</a>
    </div>
  </section>

${toolsFooterHtml()}

</body>
</html>`;

  fs.writeFileSync(path.join('public', 'tools.html'), html);
  console.log(`  tools.html (${toolsData.tools.length} tools)`);
}

// ─── Generate Collaborate / Open Projects page ───────────────────────────────

function projectStatePills(project) {
  const bits = [];
  if (project.publicStatus) bits.push(project.publicStatus);
  if (project.stage) bits.push(project.stage);
  return bits.join(' &middot; ');
}

function generateProjectCard(project, i) {
  const pillClass = project.publicStatus === 'Under review' ? 'pill pill--review' : 'pill pill--preprint';
  const exists = (project.whatExists || []).length
    ? `          <span class="proj__k">What exists</span>
          <ul class="tool__features">
            ${project.whatExists.map(x => `<li>${x}</li>`).join('\n            ')}
          </ul>\n`
    : '';
  const missing = (project.whatIsMissing || []).length
    ? `          <span class="proj__k">What is missing</span>
          <ul class="proj__gaps">
            ${project.whatIsMissing.map(x => `<li>${x}</li>`).join('\n            ')}
          </ul>\n`
    : '';
  const links = (project.links || []).length
    ? `          <div class="btn-row">
            ${project.links.map(l => `<a href="${l.href}" class="btn btn--ghost"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${l.label}</a>`).join('\n            ')}
          </div>\n`
    : '';

  return `        <div class="card" id="${project.id}">
          <div class="tool__head">
            <span class="card__meta">${String(i + 1).padStart(2, '0')} &middot; ${project.domain || ''}</span>
            <span class="${pillClass}">${project.publicStatus || 'Early'}</span>
          </div>
          <h3>${project.title}</h3>
          <p class="tool__tagline">${project.oneLine}</p>
          <p>${project.currentState}</p>
${exists}${missing}          <div class="proj__ask">
            <span class="proj__k">Who would move this</span>
            <p>${project.collaboratorProfile}</p>
          </div>
${links}        </div>`;
}

function generateCollaboratePage() {
  if (!projectsData || !projectsData.projects || !projectsData.projects.length) {
    console.log('  (projects.json absent or empty — collaborate.html skipped)');
    return;
  }
  const projects = projectsData.projects;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaborate &mdash; Dissensus</title>
  <meta name="description" content="Open research projects at Dissensus that are early, unfinished, or stalled, with an honest account of where each one actually stands and what kind of collaborator would move it.">

  <!-- Open Graph -->
  <meta property="og:title" content="Collaborate &mdash; Dissensus">
  <meta property="og:description" content="Early and unfinished research projects, with an honest account of where each one stands.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://dissensus.ai/collaborate.html">
  <meta property="og:image" content="https://dissensus.ai/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Dissensus">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Collaborate &mdash; Dissensus">
  <meta name="twitter:description" content="Early and unfinished research projects, with an honest account of where each one stands.">
  <meta name="twitter:image" content="https://dissensus.ai/og-image.png">

  <link rel="canonical" href="https://dissensus.ai/collaborate.html">
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

${getNavHtml('collaborate', '')}

  <!-- Hero -->
  <header class="container hero" style="padding-block: clamp(3rem, 8vw, 6rem);">
    <span class="kicker">Work with us</span>
    <h1>Open projects</h1>
    <p class="lead">${projectsData.intro || ''}</p>
    <p class="lead" style="margin-top: var(--sp-4);">${projectsData.introSecond || ''}</p>
  </header>

  <section class="section container">
    <span class="index">01 &middot; Open work</span>
    <h2>Where each of these actually stands</h2>
    <p>${projectsData.stateNote || ''}</p>
    <div class="grid grid--wide" style="margin-top: var(--sp-8);">

${projects.map(generateProjectCard).join('\n\n')}

    </div>
  </section>

  <section class="section container">
    <span class="index">02 &middot; How this works</span>
    <h2>What collaboration means here</h2>
    <div class="prose" style="max-width: var(--measure);">
      ${(projectsData.terms || []).map(t => `<p>${t}</p>`).join('\n      ')}
    </div>
  </section>

  <section class="section container">
    <span class="index">03 &middot; Get in touch</span>
    <h2>Propose something</h2>
    <p class="lead">${projectsData.contactNote || ''}</p>
    <form class="form" style="margin-top: 2.4rem;" action="https://formspree.io/f/mreezoko" method="POST">
      <input type="hidden" name="_subject" value="Collaboration proposal — dissensus.ai/collaborate">
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
      <label>Which project
        <select name="project">
          <option value="">&mdash; select &mdash;</option>
${projects.map(p => `          <option value="${p.id}">${p.title}</option>`).join('\n')}
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

  fs.writeFileSync(path.join('public', 'collaborate.html'), html);
  console.log(`  collaborate.html (${projects.length} open projects)`);
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
    ['manifesto.html', null, ''],
    ['charter.html', null, ''],
    ['reading.html', null, ''],
    ['press.html', null, ''],
    ['subscribe.html', null, ''],
    ['privacy.html', null, ''],
    ['terms.html', null, ''],
    ['404.html', null, ''],
    ['news/incorporation.html', 'news', '../'],
    ['news/temporal-bitmap.html', 'news', '../'],
    ['news/trident.html', 'news', '../'],
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
// 200 it should name. Rewrites ONLY those metadata fields plus sitemap <loc>;
// citation_pdf_url is left alone (it names a real .pdf, which does not redirect),
// and navigation hrefs are left alone (relative links are fine as .html).
function canonicaliseUrls() {
  const strip = url => url
    .replace(/^(https:\/\/dissensus\.ai\/[^"']*?)index\.html$/, '$1')
    .replace(/^(https:\/\/dissensus\.ai\/[^"']*?)\.html$/, '$1');

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
  for (const file of walk('public')) {
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    for (const re of FIELDS) {
      after = after.replace(re, (_m, head, url, tail) => `${head}${strip(url)}${tail}`);
    }
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
  console.log(`  canonical/og:url stripped of .html in ${touched} pages, ${smFixed} sitemap URLs`);
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
    { loc: 'https://dissensus.ai/tools.html', priority: '0.7', changefreq: 'monthly' },
    ...(projectsData ? [{ loc: 'https://dissensus.ai/collaborate.html', priority: '0.7', changefreq: 'monthly' }] : []),
    { loc: 'https://dissensus.ai/about.html', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/manifesto.html', priority: '0.6', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/charter.html', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/reading.html', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/press.html', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/subscribe.html', priority: '0.5', changefreq: 'monthly' },
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

// Generate tools / packages catalog page from tools.json
console.log('\nTools page:');
generateToolsPage();

// Generate the open-projects / collaborate page from projects.json
console.log('\nCollaborate page:');
generateCollaboratePage();

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
console.log(`\n✓ Generated ${papers.length} paper pages${toolsData ? ' + tools.html' : ''}${projectsData ? ' + collaborate.html' : ''} + sitemap`);
console.log('  Run: python -m http.server 8000 --directory public');
