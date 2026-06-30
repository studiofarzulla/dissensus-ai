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
  return `  <!-- Site Navigation -->
  <nav class="site-nav">
    <div class="site-nav__inner">
      <a href="../index.html" class="site-nav__brand">
        <img src="../assets/dissensus-mark.svg" alt="" class="site-nav__brand-logo">
        dissensus
      </a>
      <button class="site-nav__toggle" onclick="document.querySelector('.site-nav__links').classList.toggle('is-open')" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <div class="site-nav__links">
        <a href="../index.html" class="site-nav__link">Home</a>
        <a href="../research.html" class="site-nav__link${activeLink === 'research' ? ' site-nav__link--active' : ''}">Research</a>
        <a href="../tools.html" class="site-nav__link${activeLink === 'tools' ? ' site-nav__link--active' : ''}">Tools</a>
        <a href="../services.html" class="site-nav__link">Services</a>
        <a href="../about.html" class="site-nav__link">About</a>
        <a href="../collaborate.html" class="site-nav__link">Collaborate</a>
        <a href="https://asri.dissensus.ai" class="site-nav__link" target="_blank" rel="noopener">ASRI &rarr;</a>
        <a href="https://systems.ac" class="site-nav__link" target="_blank" rel="noopener">ASCRI &rarr;</a>
        <a href="mailto:research@dissensus.ai" class="site-nav__cta">Contact &rarr;</a>
      </div>
    </div>
  </nav>`;
}

function getFooterHtml() {
  return `  <footer>
    <div class="container">
      <div>
        <p>&copy; 2026 Dissensus Ltd <span style="opacity: 0.5;">&middot; Friction is the cost of existence.</span></p>
        <p class="footer__company">Registered in England &amp; Wales, company no. 17309927 &middot; Research programme: <a href="https://systems.ac" target="_blank" rel="noopener">ASCRI &rarr;</a></p>
      </div>
      <div>
        <div class="footer-links">
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

  <link rel="stylesheet" href="../css/dissensus.css">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/apple-touch-icon.png">
</head>
<body class="has-nav">
${getNavHtml('research')}

  <main class="paper-detail">
    <div class="container">
      <a href="../research.html" class="paper-detail__back">&larr; Back to publications</a>

      <header class="paper-detail__header">
        <div class="paper-detail__meta">
          <span class="paper-detail__date">${formatDate(paper.date)}</span>
          <span class="paper-detail__status ${statusClass}">${statusLabel}</span>
          ${programLabel ? `<span class="paper-detail__program">${programLabel}</span>` : ''}
        </div>
        <h1 class="paper-detail__title">${paper.title}</h1>
        ${paper.subtitle ? `<p class="paper-detail__subtitle">${paper.subtitle}</p>` : ''}
        <p class="paper-detail__authors">${authors}</p>
      </header>

      <div class="paper-detail__actions">
        ${paper.pdf ? `<a href="${paper.pdf}" class="paper-detail__action" download>Download PDF</a>` : ''}
        ${arxivUrl ? `<a href="${arxivUrl}" class="paper-detail__action" target="_blank" rel="noopener">arXiv: ${paper.arxiv}</a>` : ''}
        ${doiOnlyUrl ? `<a href="${doiOnlyUrl}" class="paper-detail__action" target="_blank" rel="noopener">DOI</a>` : ''}
        ${zenodoUrl ? `<a href="${zenodoUrl}" class="paper-detail__action" target="_blank" rel="noopener">Zenodo</a>` : ''}
        ${ssrnUrl ? `<a href="${ssrnUrl}" class="paper-detail__action" target="_blank" rel="noopener">SSRN</a>` : ''}
        ${philpapersUrl ? `<a href="${philpapersUrl}" class="paper-detail__action" target="_blank" rel="noopener">PhilPapers</a>` : ''}
        ${paper.github ? `<a href="${paper.github}" class="paper-detail__action--secondary paper-detail__action" target="_blank" rel="noopener">GitHub</a>` : ''}
        ${paper.dashboard ? `<a href="${paper.dashboard}" class="paper-detail__action--secondary paper-detail__action" target="_blank" rel="noopener">Dashboard</a>` : ''}
      </div>

      <section class="paper-detail__abstract">
        <h2>Abstract</h2>
        <p>${paper.abstract}</p>
      </section>

      <section class="paper-detail__citation">
        <h2>Suggested Citation</h2>
        <div class="paper-detail__citation-block">
          ${authors} (${year}). <em>${paper.title}</em>. Dissensus${paper.wpNumber ? ` ${paper.wpNumber.startsWith('DP') ? 'Discussion' : 'Working'} Paper ${paper.wpNumber}` : ''}. ${doi ? `DOI: ${doi}` : ''}
        </div>
        <button class="paper-detail__bibtex-btn" onclick="copyBibTeX(this)">
          <span>&#x27E8;/&#x27E9;</span> Copy BibTeX
        </button>
      </section>

      ${paper.methods && paper.methods.length > 0 ? `<section class="paper-detail__methods">
        <h2>Methodology</h2>
        <div class="paper-detail__tag-list">
          ${paper.methods.map(m => `<span class="paper-detail__tag">${m}</span>`).join('\n          ')}
        </div>
      </section>` : ''}

      <section class="paper-detail__tags">
        <h2>Topics</h2>
        <div class="paper-detail__tag-list">
          ${paper.tags.map(t => `<span class="paper-detail__tag">${tagLabels[t] || t}</span>`).join('\n          ')}
        </div>
      </section>
    </div>
  </main>

${getFooterHtml()}

  <script>
    function copyBibTeX(btn) {
      var bibtex = ${JSON.stringify(bibtex)};
      navigator.clipboard.writeText(bibtex).then(function() {
        var original = btn.innerHTML;
        btn.innerHTML = '<span>\\u2713</span> Copied!';
        btn.classList.add('paper-detail__bibtex-btn--copied');
        setTimeout(function() {
          btn.innerHTML = original;
          btn.classList.remove('paper-detail__bibtex-btn--copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

// ─── Regenerate research.html publication list from papers.json ───────────────

function pubItemStatus(paper) {
  if (paper.status === 'under-review') {
    return `            <span class="pub-item__status">Under Review${paper.journal ? ' &middot; ' + paper.journal : ''}</span>\n`;
  }
  if (paper.arxiv) {
    return `            <span class="pub-item__status">arXiv: ${paper.arxiv}</span>\n`;
  }
  return `            <span class="pub-item__status">Preprint</span>\n`;
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
    out += `      <div class="pub-category">\n`;
    out += `        <h3 class="pub-category__title">${categoryLabels[cat] || cat}</h3>\n`;
    out += `        <p style="color: var(--text-secondary); font-size: 0.8125rem; margin-bottom: var(--space-md);">${blurb}</p>\n`;
    out += `        <div class="pub-list">\n`;
    items.forEach(paper => {
      out += `          <a href="papers/${paper.id}.html" class="pub-item">\n`;
      out += pubItemStatus(paper);
      out += `            <span class="pub-item__title">${paper.title}</span>\n`;
      out += `            <span class="pub-item__detail">${pubItemDetail(paper)}</span>\n`;
      out += `          </a>\n`;
    });
    out += `        </div>\n`;
    out += `      </div>\n\n`;
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
  return `  <!-- Site Navigation -->
  <nav class="site-nav">
    <div class="site-nav__inner">
      <a href="index.html" class="site-nav__brand">
        <img src="assets/dissensus-mark.svg" alt="" class="site-nav__brand-logo">
        dissensus
      </a>
      <button class="site-nav__toggle" onclick="document.querySelector('.site-nav__links').classList.toggle('is-open')" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <div class="site-nav__links">
        <a href="index.html" class="site-nav__link">Home</a>
        <a href="research.html" class="site-nav__link">Research</a>
        <a href="tools.html" class="site-nav__link site-nav__link--active">Tools</a>
        <a href="services.html" class="site-nav__link">Services</a>
        <a href="about.html" class="site-nav__link">About</a>
        <a href="collaborate.html" class="site-nav__link">Collaborate</a>
        <a href="https://asri.dissensus.ai" class="site-nav__link" target="_blank" rel="noopener">ASRI &rarr;</a>
        <a href="https://systems.ac" class="site-nav__link" target="_blank" rel="noopener">ASCRI &rarr;</a>
        <a href="mailto:research@dissensus.ai" class="site-nav__cta">Contact &rarr;</a>
      </div>
    </div>
  </nav>`;
}

function toolsFooterHtml() {
  return `  <footer>
    <div class="container">
      <div>
        <p>&copy; 2026 Dissensus Ltd <span style="opacity: 0.5;">&middot; Friction is the cost of existence.</span></p>
        <p class="footer__company">Registered in England &amp; Wales, company no. 17309927</p>
      </div>
      <div>
        <div class="footer-links">
          <a href="index.html">Home</a> &middot;
          <a href="research.html">Research</a> &middot;
          <a href="tools.html">Tools</a> &middot;
          <a href="services.html">Services</a> &middot;
          <a href="about.html">About</a> &middot;
          <a href="collaborate.html">Collaborate</a> &middot;
          <a href="https://asri.dissensus.ai" target="_blank" rel="noopener">ASRI</a> &middot;
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
    </div>
  </footer>`;
}

function toolActionButtons(tool) {
  const btns = [];
  if (tool.dashboard) {
    btns.push(`<a href="${tool.dashboard}" class="paper-detail__action" target="_blank" rel="noopener">Open dashboard &rarr;</a>`);
  }
  if (tool.pypi) {
    btns.push(`<a href="https://pypi.org/project/${tool.pypi}/" class="paper-detail__action" target="_blank" rel="noopener">PyPI: ${tool.pypi}</a>`);
  }
  if (tool.arxiv) {
    btns.push(`<a href="https://arxiv.org/abs/${tool.arxiv}" class="paper-detail__action" target="_blank" rel="noopener">arXiv: ${tool.arxiv}</a>`);
  }
  if (tool.zenodo) {
    btns.push(`<a href="https://doi.org/${tool.zenodo}" class="paper-detail__action" target="_blank" rel="noopener">DOI</a>`);
  }
  if (tool.github) {
    btns.push(`<a href="${tool.github}" class="paper-detail__action--secondary paper-detail__action" target="_blank" rel="noopener">GitHub</a>`);
  }
  if (tool.docs) {
    btns.push(`<a href="${tool.docs}" class="paper-detail__action--secondary paper-detail__action" target="_blank" rel="noopener">Docs</a>`);
  }
  (tool.relatedPapers || []).forEach(id => {
    const p = papersById[id];
    if (!p) return;
    btns.push(`<a href="papers/${id}.html" class="paper-detail__action--secondary paper-detail__action" title="${escapeHtml(p.title)}">Paper &rarr;</a>`);
  });
  if (!btns.length) return '';
  return `        <div class="paper-detail__actions" style="border-bottom: none; padding-bottom: 0;">
          ${btns.join('\n          ')}
        </div>`;
}

function toolIdentifierBadges(tool) {
  const badges = [];
  if (tool.version) badges.push(['Version', `v${tool.version}`]);
  if (tool.zenodo) badges.push(['DOI', tool.zenodo]);
  if (tool.arxiv) badges.push(['arXiv', tool.arxiv]);
  if (!badges.length) return '';
  return `        <div class="tool-badge-row">
          ${badges.map(([l, v]) => `<span class="doi-badge"><span class="doi-badge__label">${l}</span><span class="doi-badge__value">${v}</span></span>`).join('\n          ')}
        </div>`;
}

function toolMetricBadges(tool) {
  if (!tool.metrics || !tool.metrics.length) return '';
  return `        <div class="tool-badge-row">
          ${tool.metrics.map(m => `<span class="doi-badge"><span class="doi-badge__label">${m.label}</span><span class="doi-badge__value">${m.value}</span></span>`).join('\n          ')}
        </div>`;
}

function generateToolCard(tool) {
  const statusLabel = (toolsData.toolStatuses && toolsData.toolStatuses[tool.status]) || tool.status;
  const labelBits = [tool.kind, tool.version ? `v${tool.version}` : null].filter(Boolean).join(' &middot; ');
  return `        <div class="service-card">
          <div class="tool-card__head">
            <span class="service-card__label">${labelBits}</span>
            <span class="paper-detail__status paper-detail__status--${tool.status}">${statusLabel}</span>
          </div>
          <h3>${tool.name}</h3>
          <p class="tool-card__tagline">${tool.tagline}</p>
          <p>${tool.description}</p>
${tool.install ? `          <code class="tool-install">${tool.install}</code>\n` : ''}${tool.features && tool.features.length ? `          <ul class="service-card__features">
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
    sections += `  <section class="research" data-index="${String(i + 1).padStart(2, '0')}">
    <div class="container">
      <h2>${cats[cat] || cat}</h2>
      ${blurb ? `<p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: var(--space-md);">${blurb}</p>` : ''}
      <div class="services-grid">

${items.map(generateToolCard).join('\n\n')}

      </div>
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
  <meta name="description" content="Open-source software packages, indices, and live dashboards from Dissensus — implementing the lab's quantitative methods for friction analysis and systemic risk.">
  <meta name="theme-color" content="#050505">

  <!-- Open Graph -->
  <meta property="og:title" content="Tools &amp; Packages | Dissensus">
  <meta property="og:description" content="Open-source packages and live indices implementing the lab's quantitative methods.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://dissensus.ai/tools.html">
  <meta property="og:image" content="https://dissensus.ai/assets/logo.png">

  <link rel="canonical" href="https://dissensus.ai/tools.html">
  <link rel="stylesheet" href="css/dissensus.css">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="assets/favicon-64.png">
  <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
</head>
<body class="has-nav">
${toolsNavHtml()}

  <!-- Hero -->
  <section class="hero" style="min-height: auto; padding: var(--space-xl) 0;">
    <div class="container">
      <span class="hero__label">Tools &amp; Packages</span>
      <h1 style="font-size: clamp(2rem, 5vw, 2.5rem); letter-spacing: 0.05em; margin-bottom: var(--space-md);">
        Open Tooling
      </h1>
      <p class="hero__etymology" style="margin-bottom: 0;">
        Software, indices, and live dashboards that implement the lab's quantitative methods.
        Everything here is open-access and citable; install commands and DOIs are listed per package.
      </p>
    </div>
  </section>

${sections}  <!-- Contribute -->
  <section class="contact" data-index="${String(order.length + 1).padStart(2, '0')}">
    <div class="container">
      <h2>Build With Us</h2>
      <p style="margin-bottom: var(--space-lg); max-width: 540px;">
        These packages are released CC-BY / open-source as the research that produced them is published.
        If a tool is useful to your work&mdash;or broken in an interesting way&mdash;we want to hear about it.
      </p>
      <div class="contact__wrapper">
        <a href="mailto:research@dissensus.ai" class="email">research@dissensus.ai</a>
        <span class="contact__status">Issues &amp; collaboration welcome</span>
      </div>
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
