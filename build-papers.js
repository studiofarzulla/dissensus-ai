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
${doiLine}  url = {https://dissensus.ai/papers/${paper.id}.html}
}`;
}

// ─── Nav HTML (matches existing pages) ───────────────────────────────────────

function getNavHtml(activeLink) {
  return `  <nav class="nav">
    <a href="../index.html" class="nav__brand"><img src="../assets/dissensus-mark.svg" alt="" class="nav__brand-mark"> Dissensus</a>
    <div class="nav__links">
      <a href="../research.html"${activeLink === 'research' ? ' class="is-active"' : ''}>Research</a>
      <a href="../tools.html"${activeLink === 'tools' ? ' class="is-active"' : ' class="hide-sm"'}>Tools</a>
      <a href="../about.html" class="hide-sm">About</a>
      <a href="../services.html" class="hide-sm">Services</a>
      <a href="../collaborate.html" class="hide-sm">Collaborate</a>
      <a href="https://asri.dissensus.ai" class="hide-sm" target="_blank" rel="noopener">ASRI &#8599;</a>
      <button class="toggle" onclick="toggleTheme()">&#9689; theme</button>
    </div>
  </nav>`;
}

function getFooterHtml() {
  return `  <footer class="footer">
    <div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1.5rem;">
      <div>
        <p style="margin-bottom:.4rem;">&copy; 2026 Dissensus Ltd &middot; Friction is the cost of existence.</p>
        <p>Registered in England and Wales, company no. 17309927 &middot; Programme: <a href="https://systems.ac" target="_blank" rel="noopener">ASCRI &rarr;</a></p>
      </div>
      <div style="max-width:560px;">
        <a href="../index.html">Home</a> &middot;
        <a href="../research.html">Research</a> &middot;
        <a href="../tools.html">Tools</a> &middot;
        <a href="../services.html">Services</a> &middot;
        <a href="../about.html">About</a> &middot;
        <a href="../collaborate.html">Collaborate</a> &middot;
        <a href="https://asri.dissensus.ai" target="_blank" rel="noopener">ASRI</a> &middot;
        <a href="https://systems.ac" target="_blank" rel="noopener">ASCRI</a> &middot;
        <a href="../manifesto.html">Manifesto</a> &middot;
        <a href="../charter.html">Charter</a> &middot;
        <a href="../reading.html">Reading</a> &middot;
        <a href="../press.html">Press</a> &middot;
        <a href="../subscribe.html">Subscribe</a> &middot;
        <a href="../privacy.html">Privacy</a> &middot;
        <a href="../terms.html">Terms</a> &middot;
        <a href="../feed.xml" title="RSS Feed">RSS</a>
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
  <meta name="theme-color" content="#050505">
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
    "headline": "${escapeHtml(paper.title)}",
    "author": [
        ${authorsSchema}
    ],
    "datePublished": "${paper.date}",
    "publisher": {
      "@type": "Organization",
      "name": "Dissensus",
      "url": "https://dissensus.ai"
    },
    "description": "${escapeHtml(paper.abstract.replace(/\n/g, ' '))}",
    ${doi ? `"identifier": {"@type": "PropertyValue", "propertyID": "DOI", "value": "${doi}"},` : ''}
    "url": "https://dissensus.ai/papers/${paper.id}.html",
    "inLanguage": "en"
  }
  </script>

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://dissensus.ai/papers/${paper.id}.html">
  <meta property="og:title" content="${escapeHtml(paper.title)}">
  <meta property="og:description" content="${escapeHtml(paper.abstract.substring(0, 200))}...">
  <meta property="og:site_name" content="Dissensus">
  <meta property="og:image" content="https://dissensus.ai/assets/logo.png">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(paper.title)}">
  <meta name="twitter:description" content="${escapeHtml(paper.abstract.substring(0, 200))}...">
  <meta name="twitter:image" content="https://dissensus.ai/assets/logo.png">

  <!-- Canonical -->
  <link rel="canonical" href="https://dissensus.ai/papers/${paper.id}.html">

  <title>${escapeHtml(paper.title)} — Dissensus</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/system.css">
  <link rel="stylesheet" href="../css/site.css">
  <script src="../js/theme.js"></script>
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/apple-touch-icon.png">
</head>
<body>
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
  const re = /(<h2>Publications<\/h2>\n)[\s\S]*?(\n\s*<p class="research-note">)/;
  if (!re.test(html)) {
    console.log('  (research.html publications anchors not found — skipped)');
    return;
  }
  html = html.replace(re, `$1\n${block}$2`);
  fs.writeFileSync(file, html);
  console.log('  research.html (publications list regenerated)');
}

// ─── Generate Tools / Packages page (data-driven from tools.json) ─────────────

function toolsNavHtml() {
  return `  <nav class="nav">
    <a href="index.html" class="nav__brand"><img src="assets/dissensus-mark.svg" alt="" class="nav__brand-mark"> Dissensus</a>
    <div class="nav__links">
      <a href="research.html">Research</a>
      <a href="tools.html" class="is-active">Tools</a>
      <a href="about.html" class="hide-sm">About</a>
      <a href="services.html" class="hide-sm">Services</a>
      <a href="collaborate.html" class="hide-sm">Collaborate</a>
      <a href="https://asri.dissensus.ai" class="hide-sm" target="_blank" rel="noopener">ASRI &#8599;</a>
      <button class="toggle" onclick="toggleTheme()">&#9689; theme</button>
    </div>
  </nav>`;
}

function toolsFooterHtml() {
  return `  <footer class="footer">
    <div class="container" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1.5rem;">
      <div>
        <p style="margin-bottom:.4rem;">&copy; 2026 Dissensus Ltd &middot; Friction is the cost of existence.</p>
        <p>Registered in England and Wales, company no. 17309927</p>
      </div>
      <div style="max-width:560px;">
        <a href="index.html">Home</a> &middot;
        <a href="research.html">Research</a> &middot;
        <a href="tools.html">Tools</a> &middot;
        <a href="services.html">Services</a> &middot;
        <a href="about.html">About</a> &middot;
        <a href="collaborate.html">Collaborate</a> &middot;
        <a href="https://asri.dissensus.ai" target="_blank" rel="noopener">ASRI</a> &middot;
        <a href="https://systems.ac" target="_blank" rel="noopener">ASCRI</a> &middot;
        <a href="manifesto.html">Manifesto</a> &middot;
        <a href="charter.html">Charter</a> &middot;
        <a href="reading.html">Reading</a> &middot;
        <a href="press.html">Press</a> &middot;
        <a href="subscribe.html">Subscribe</a> &middot;
        <a href="privacy.html">Privacy</a> &middot;
        <a href="terms.html">Terms</a> &middot;
        <a href="feed.xml" title="RSS Feed">RSS</a>
      </div>
    </div>
  </footer>`;
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
  const labelBits = [tool.kind, tool.version ? `v${tool.version}` : null].filter(Boolean).join(' &middot; ');
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

  let sections = '';
  order.forEach(([cat, blurb], i) => {
    const items = toolsData.tools.filter(t => t.category === cat);
    if (!items.length) return;
    sections += `  <section class="section container">
    <span class="index">${String(i + 1).padStart(2, '0')} &middot; ${cats[cat] || cat}</span>
    <h2>${cats[cat] || cat}</h2>
    ${blurb ? `<p class="pubgroup__blurb">${blurb}</p>` : ''}
    <div class="grid">

${items.map(generateToolCard).join('\n\n')}

    </div>
  </section>

`;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tools &amp; Packages | Dissensus</title>
  <meta name="description" content="Open-source software packages, indices, and live dashboards from Dissensus, implementing the lab's quantitative methods for friction analysis and systemic risk.">

  <!-- Open Graph -->
  <meta property="og:title" content="Tools &amp; Packages | Dissensus">
  <meta property="og:description" content="Open-source packages and live indices implementing the lab's quantitative methods.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://dissensus.ai/tools.html">
  <meta property="og:image" content="https://dissensus.ai/assets/logo.png">

  <link rel="canonical" href="https://dissensus.ai/tools.html">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/system.css">
  <link rel="stylesheet" href="css/site.css">
  <script src="js/theme.js"></script>
  <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="assets/favicon-64.png">
  <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
</head>
<body>
${toolsNavHtml()}

  <!-- Hero -->
  <header class="container hero" style="padding-block: clamp(3rem, 8vw, 6rem);">
    <span class="kicker">Tools &amp; Packages</span>
    <h1>Open tooling</h1>
    <p class="lead">Software, indices, and live dashboards that implement the lab's quantitative methods. Everything here is open-access and citable; install commands and DOIs are listed per package.</p>
  </header>

${sections}  <!-- Contribute -->
  <section class="section container">
    <span class="index">${String(order.length + 1).padStart(2, '0')} &middot; Contribute</span>
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

// ─── Generate Sitemap ────────────────────────────────────────────────────────

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { loc: 'https://dissensus.ai/', priority: '1.0', changefreq: 'weekly' },
    { loc: 'https://dissensus.ai/research.html', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://dissensus.ai/tools.html', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/about.html', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/services.html', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://dissensus.ai/collaborate.html', priority: '0.7', changefreq: 'monthly' },
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

// Regenerate research.html publication list from papers.json
console.log('\nResearch page:');
updateResearchPage();

// Generate tools / packages catalog page from tools.json
console.log('\nTools page:');
generateToolsPage();

// Generate sitemap
console.log('\nSitemap:');
generateSitemap();

// Summary
console.log(`\n✓ Generated ${papers.length} paper pages${toolsData ? ' + tools.html' : ''} + sitemap`);
console.log('  Run: python -m http.server 8000 --directory public');
