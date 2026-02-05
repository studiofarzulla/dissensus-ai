#!/usr/bin/env node
/**
 * Dissensus AI — Paper Page Generator
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
  howpublished = {Dissensus AI ${paper.wpNumber && paper.wpNumber.startsWith('DP') ? 'Discussion' : 'Working'} Paper${paper.wpNumber ? ' ' + paper.wpNumber : ''}},
${doiLine}  url = {https://dissensus.ai/papers/${paper.id}.html}
}`;
}

// ─── Nav HTML (matches existing pages) ───────────────────────────────────────

function getNavHtml(activeLink) {
  return `  <!-- Site Navigation -->
  <nav class="site-nav">
    <div class="site-nav__inner">
      <a href="../index.html" class="site-nav__brand">
        <img src="../assets/dissensus-logo-white.svg" alt="" class="site-nav__brand-logo">
        dissensus<span class="site-nav__brand-ai">AI</span>
      </a>
      <button class="site-nav__toggle" onclick="document.querySelector('.site-nav__links').classList.toggle('is-open')" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <div class="site-nav__links">
        <a href="../index.html" class="site-nav__link${activeLink === 'research' ? ' site-nav__link--active' : ''}">Research</a>
        <a href="../services.html" class="site-nav__link">Services</a>
        <a href="../about.html" class="site-nav__link">About</a>
        <a href="../collaborate.html" class="site-nav__link">Collaborate</a>
        <a href="mailto:research@dissensus.ai" class="site-nav__cta">Contact &rarr;</a>
      </div>
    </div>
  </nav>`;
}

function getFooterHtml() {
  return `  <footer>
    <div class="container">
      <div>
        <p>&copy; 2026 Dissensus AI Ltd <span style="opacity: 0.5;">&middot; Friction is the cost of existence.</span></p>
        <p class="footer__company">Incorporation pending &middot; England &amp; Wales</p>
      </div>
      <div>
        <div class="footer-links">
          <a href="../index.html">Research</a> &middot;
          <a href="../services.html">Services</a> &middot;
          <a href="../about.html">About</a> &middot;
          <a href="../collaborate.html">Collaborate</a> &middot;
          <a href="../manifesto.html">Manifesto</a> &middot;
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
  const doi = paper.doi || paper.zenodo || '';
  const doiUrl = doi ? (doi.startsWith('10.') ? `https://doi.org/${doi}` : doi) : '';
  const pdfUrl = paper.pdf ? `https://farzulla.org/papers/${paper.pdf}` : '';
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
            "name": "Dissensus AI",
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
  <meta name="citation_publisher" content="Dissensus AI">
  <meta name="citation_abstract_html_url" content="https://dissensus.ai/papers/${paper.id}.html">
  <meta name="citation_keywords" content="${paper.tags.map(t => tagLabels[t] || t).join('; ')}">
  <meta name="citation_language" content="en">

  <!-- Dublin Core -->
  <meta name="DC.title" content="${escapeHtml(paper.title)}">
  <meta name="DC.creator" content="${escapeHtml(authors)}">
  <meta name="DC.date" content="${paper.date}">
  <meta name="DC.publisher" content="Dissensus AI">
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
      "name": "Dissensus AI",
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
  <meta property="og:site_name" content="Dissensus AI">
  <meta property="og:image" content="https://dissensus.ai/assets/logo.png">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(paper.title)}">
  <meta name="twitter:description" content="${escapeHtml(paper.abstract.substring(0, 200))}...">
  <meta name="twitter:image" content="https://dissensus.ai/assets/logo.png">

  <!-- Canonical -->
  <link rel="canonical" href="https://dissensus.ai/papers/${paper.id}.html">

  <title>${escapeHtml(paper.title)} — Dissensus AI</title>

  <link rel="stylesheet" href="../css/dissensus.css">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/apple-touch-icon.png">
</head>
<body class="has-nav">
${getNavHtml('research')}

  <main class="paper-detail">
    <div class="container">
      <a href="../index.html#publications" class="paper-detail__back">&larr; Back to publications</a>

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
        ${doiUrl ? `<a href="${doiUrl}" class="paper-detail__action" target="_blank" rel="noopener">DOI</a>` : ''}
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
          ${authors} (${year}). <em>${paper.title}</em>. Dissensus AI${paper.wpNumber ? ` ${paper.wpNumber.startsWith('DP') ? 'Discussion' : 'Working'} Paper ${paper.wpNumber}` : ''}. ${doi ? `DOI: ${doi}` : ''}
        </div>
        <button class="paper-detail__bibtex-btn" onclick="copyBibTeX(this)">
          <span>&#x27E8;/&#x27E9;</span> Copy BibTeX
        </button>
      </section>

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

// ─── Generate Sitemap ────────────────────────────────────────────────────────

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { loc: 'https://dissensus.ai/', priority: '1.0', changefreq: 'weekly' },
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

console.log('Dissensus AI — Paper Page Generator');
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

// Generate sitemap
console.log('\nSitemap:');
generateSitemap();

// Summary
console.log(`\n✓ Generated ${papers.length} paper pages + sitemap`);
console.log('  Run: python -m http.server 8000 --directory public');
