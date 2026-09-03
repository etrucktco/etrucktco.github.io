#!/usr/bin/env node
/*
 * build-models.js — regenerates the truck model pages from data/trucks.json.
 *
 *   node tools/build-models.js
 *
 * Writes: man-etgx.html, windrose-r700.html, models.html
 * Nothing else in the site is touched. No dependencies; plain Node.
 *
 * Editing rule: never hand-edit the generated pages. Edit data/trucks.json
 * and run this again, or your change is lost on the next build.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'trucks.json'), 'utf8'));
const SITE = 'https://etrucktco.be';

/* ------------------------------------------------------------------ utils */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const nf = n => (n == null || isNaN(n)) ? null : Number(n).toLocaleString('en-GB').replace(/,/g, ' ');

// A spec cell: the number, plus a badge saying how much we trust it.
const BADGE = {
  official: ['official', '#137a4d', '#d7f2e5'],
  reported: ['reported', '#1c4f73', '#dbeaf5'],
  derived:  ['derived',  '#8a5418', '#f7e6cf'],
  estimate: ['estimate', '#7a4a4a', '#f3e0e0']
};
function badge(conf) {
  const b = BADGE[conf]; if (!b) return '';
  return `<span class="badge" style="color:${b[1]};background:${b[2]}">${b[0]}</span>`;
}

// Render one spec field (single value or min/max band) into a table cell.
function specCell(f, unit, opts) {
  opts = opts || {};
  if (!f) return '<td class="na">not published</td>';
  let txt;
  if (f.value !== undefined) {
    txt = f.value == null ? null : (opts.money ? '€' + nf(f.value) : nf(f.value));
  } else {
    const lo = f.min, hi = f.max;
    if (lo == null && hi == null) txt = null;
    else if (lo == null) txt = (opts.money ? 'up to €' + nf(hi) : 'up to ' + nf(hi));
    else if (hi == null) txt = (opts.money ? 'from €' + nf(lo) : 'from ' + nf(lo));
    else txt = (opts.money ? '€' + nf(lo) + '–€' + nf(hi) : nf(lo) + '–' + nf(hi));
  }
  if (txt == null) return `<td class="na">not published${f.note ? footnote(f.note) : ''}</td>`;
  return `<td><span class="val">${txt}${unit ? '<span class="unit"> ' + unit + '</span>' : ''}</span> ${badge(f.confidence)}${f.note ? footnote(f.note) : ''}</td>`;
}

let noteSeq = 0;
function footnote(text) {
  noteSeq++;
  return `<details class="fn"><summary>why</summary><p>${esc(text)}</p></details>`;
}

/* ------------------------------------------------------------------- css */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
  :root{--ink:#16140f;--paper:#f4efe4;--paper2:#ece4d3;--diesel:#b8772a;--diesel-dark:#8a5418;
    --volt:#1faa6e;--volt-dark:#137a4d;--volt-light:#d7f2e5;--line:#d8cdb6;--muted:#736b58;
    --road:#26231c;--navy:#1e2a33;--sans:'Barlow',-apple-system,sans-serif;--cond:'Barlow Condensed',sans-serif;}
  *{box-sizing:border-box;margin:0;padding:0}
  html{-webkit-text-size-adjust:100%}
  body{font-family:var(--sans);color:var(--ink);line-height:1.55;min-height:100vh;display:flex;flex-direction:column;
    background:radial-gradient(110% 70% at 85% -5%, rgba(31,170,110,.12), transparent 55%),linear-gradient(180deg,var(--paper),var(--paper2));}
  .wrap{width:100%;max-width:1000px;margin:0 auto;padding:0 20px}
  .topbar{background:var(--road);color:#f4efe4;padding:11px 0;border-bottom:4px solid var(--diesel)}
  .topbar .wrap{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
  .brand{font-family:var(--cond);font-weight:900;font-size:23px;letter-spacing:.02em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
  .brand .plug{color:var(--volt)}
  .brand .be{font-size:12px;background:var(--diesel);color:#fff;padding:2px 7px;border-radius:4px;font-weight:700;letter-spacing:.05em}
  .nav{display:flex;gap:16px;flex-wrap:wrap}
  .nav a{color:#cdbf9f;text-decoration:none;font-size:13.5px}
  .nav a:hover,.nav a[aria-current]{color:#fff}
  main{flex:1}
  .hero{padding:34px 0 4px}
  .kicker{font-family:var(--cond);font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:13.5px;color:var(--diesel-dark)}
  h1{font-family:var(--cond);font-weight:900;font-size:clamp(34px,6vw,54px);line-height:.98;text-transform:uppercase;margin:8px 0 0}
  .lede{font-size:17.5px;color:#534c3d;margin:14px 0 0;max-width:66ch}
  h2{font-family:var(--cond);font-weight:900;text-transform:uppercase;font-size:27px;line-height:1.05;margin:34px 0 4px}
  h2 .n{color:var(--volt-dark);margin-right:9px}
  h3{font-family:var(--cond);font-weight:800;text-transform:uppercase;font-size:18px;letter-spacing:.03em;margin:20px 0 6px}
  p{margin:0 0 12px;max-width:70ch;font-size:15.5px}
  .card{background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:18px 20px;margin:14px 0}
  .card.warn{background:#fdf6ea;border-color:#e3c690}
  .card.warn strong{color:var(--diesel-dark)}
  .tblwrap{overflow-x:auto;margin:12px 0 4px;border:1.5px solid var(--line);border-radius:14px;background:#fff}
  table{width:100%;border-collapse:collapse;min-width:560px}
  caption{caption-side:top;text-align:left;padding:14px 16px 0;font-family:var(--cond);font-weight:800;
    text-transform:uppercase;letter-spacing:.05em;font-size:15px;color:var(--diesel-dark)}
  th,td{padding:10px 14px;text-align:left;font-size:14.5px;border-bottom:1px solid #efe8d8;vertical-align:top}
  thead th{background:var(--road);color:#f4efe4;font-family:var(--cond);text-transform:uppercase;letter-spacing:.05em;font-size:13.5px;border-bottom:none;white-space:nowrap}
  tbody th{font-weight:600;color:var(--muted);width:26%}
  tr:last-child th,tr:last-child td{border-bottom:none}
  td.na{color:#9a917c;font-style:italic}
  .val{font-weight:700;font-variant-numeric:tabular-nums}
  .val .unit{font-weight:500;color:var(--muted);font-size:13px}
  .badge{display:inline-block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
    padding:2px 7px;border-radius:20px;vertical-align:2px;white-space:nowrap}
  details.fn{display:block;margin-top:5px}
  details.fn summary{cursor:pointer;font-size:12px;color:var(--volt-dark);font-weight:600;list-style:none}
  details.fn summary::-webkit-details-marker{display:none}
  details.fn summary::before{content:"▸ ";}
  details.fn[open] summary::before{content:"▾ ";}
  details.fn p{font-size:13px;color:var(--muted);margin:5px 0 0;max-width:52ch;line-height:1.5}
  .legend{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 0;font-size:12.5px;color:var(--muted);align-items:center}
  ul.plain{list-style:none;margin:0 0 12px}
  ul.plain li{display:flex;gap:9px;margin-bottom:6px;font-size:15px}
  ul.plain .ck{color:var(--volt-dark);font-weight:800;flex-shrink:0}
  .srclist{list-style:none;margin:8px 0 0}
  .srclist li{padding:9px 0;border-bottom:1px dotted #ded4bd;font-size:14.5px}
  .srclist li:last-child{border-bottom:none}
  .srclist a{color:var(--volt-dark);font-weight:600}
  .srclist .meta{color:var(--muted);font-size:13px}
  .srclist .why{color:var(--muted);font-size:13px;display:block;margin-top:3px}
  footer{margin-top:38px;background:var(--road);color:#a99e85;padding:22px 0 30px;font-size:12.5px}
  footer .wrap{display:flex;flex-direction:column;gap:6px}
  footer b{color:#e8e0cf}
  footer a{color:var(--volt);text-decoration:none}
  .field{margin-bottom:13px}
  .field label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;margin-bottom:4px}
  .field select,.field input[type=range]{width:100%}
  .field select{padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:14.5px;color:var(--ink)}
  .field .rowline{display:flex;align-items:center;gap:10px}
  .field .rv{font-weight:700;color:var(--volt-dark);font-variant-numeric:tabular-nums;min-width:58px;text-align:right}
  input[type=range]{accent-color:var(--volt)}
  .out{background:linear-gradient(160deg,var(--navy),#16202a);color:#eef2f4;border-radius:14px;padding:20px 22px}
  .out .big{font-family:var(--cond);font-weight:900;font-size:46px;line-height:1;color:#8fd9b6}
  .out .big .u{font-size:20px;color:#c4ced4;margin-left:5px}
  .out .sub{font-size:14px;color:#c4ced4;margin-top:7px}
  .out .rows{margin-top:15px;border-top:1px solid #33454f;padding-top:12px}
  .out .r{display:flex;justify-content:space-between;gap:14px;font-size:14px;padding:4px 0}
  .out .r span:first-child{color:#9fb0bb}
  .out .r b{font-variant-numeric:tabular-nums}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start}
  @media(max-width:760px){.grid2{grid-template-columns:1fr}h2{font-size:23px}}
`;

/* ---------------------------------------------------------------- chrome */
function head(o) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${SITE}/${o.slug}.html">
<meta property="og:type" content="article">
<meta property="og:site_name" content="eTruckTCO.be">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${SITE}/${o.slug}.html">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
${o.jsonld ? '<script type="application/ld+json">' + JSON.stringify(o.jsonld) + '</script>' : ''}
<style>${CSS}</style>
</head>
<body>
<div class="topbar"><div class="wrap">
  <div class="brand">e<span class="plug">⚡</span>TruckTCO <span class="be">BE</span></div>
  <nav class="nav">
    <a href="index.html">Home</a>
    <a href="eTruckCost.html">Quick answer</a>
    <a href="eTruckAnalysis.html">Full analysis</a>
    <a href="models.html"${o.slug === 'models' ? ' aria-current="page"' : ''}>Trucks</a>
    <a href="compare.html">Head to head</a>
  </nav>
</div></div>
<main>`;
}

const FOOT = `</main>
<footer><div class="wrap">
  <div><b>eTruckTCO.be</b> — independent electric-truck cost comparison for Belgian fleets.</div>
  <div>Specifications come from manufacturers and named trade press; every figure on these pages carries a label saying how firm it is. <a href="data/trucks.json">The underlying data is published as JSON</a>.</div>
  <div>Estimates for guidance only. Not financial advice — your real costs depend on routes, energy contract and truck.</div>
</div></footer>
</body>
</html>`;

const LEGEND = `<div class="legend"><span>How firm is each number?</span>
  ${badge('official')}<span>manufacturer</span>
  ${badge('reported')}<span>named trade press</span>
  ${badge('derived')}<span>our arithmetic</span>
  ${badge('estimate')}<span>our estimate</span></div>`;


// The price caveat only appears when a price on the page actually is an estimate.
function priceWarn(m) {
  const conf = m.variants.map(v => v.price_eur && v.price_eur.confidence);
  const anyEstimate = conf.some(c => c === 'estimate' || c === 'derived');
  const allOfficial = conf.every(c => c === 'official');
  if (allOfficial) {
    return `<div class="card"><p style="margin:0"><strong>This price comes from the manufacturer.</strong> It is a list price excluding local taxes, not a quote for your fleet. Put the figure you are actually offered into <a href="eTruckAnalysis.html" style="color:var(--volt-dark);font-weight:700">the full business case</a>, which lets you type your own purchase price.</p></div>`;
  }
  if (anyEstimate) {
    return `<div class="card warn"><p style="margin:0"><strong>The prices on this page are estimates.</strong> No European list price is published for a fleet specification of this truck. Use them to frame the question, then put the real quote into <a href="eTruckAnalysis.html" style="color:var(--diesel-dark);font-weight:700">the full business case</a>, which lets you type your own purchase price.</p></div>`;
  }
  return '';
}

/* ----------------------------------------------------------- model page */
function modelPage(m) {
  const v0 = m.variants.find(v => v.headline) || m.variants[0];
  const cols = m.variants;

  const row = (label, key, unit, opts) =>
    `<tr><th>${label}</th>${cols.map(v => specCell(v[key], unit, opts)).join('')}</tr>`;

  const specTable = `
  <div class="tblwrap"><table>
    <caption>Key specifications</caption>
    <thead><tr><th>Specification</th>${cols.map(v => `<th>${esc(v.label)}</th>`).join('')}</tr></thead>
    <tbody>
      <tr><th>Axle configuration</th>${cols.map(v => `<td><span class="val">${esc(v.axle_config)}</span></td>`).join('')}</tr>
      ${row('Battery packs', 'battery_packs', '')}
      ${row('Battery capacity', 'battery_kwh', 'kWh')}
      ${row('Range — claimed', 'range_claimed_km', 'km')}
      ${row('Range — loaded', 'range_loaded_km', 'km')}
      ${row('Range — realistic band', 'range_realistic_km', 'km')}
      ${row('Power', 'power_hp', 'hp')}
      ${row('Charging power, max', 'charging_mcs_kw_max', 'kW')}
      ${row('Charge 20–80%', 'charge_20_80_min', 'min')}
      ${row('Price, indicative', 'price_eur', '', { money: true })}
    </tbody>
  </table></div>
  ${LEGEND}`;

  const rd = DATA.range_definitions;
  const sources = m.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>
      <span class="meta">— ${esc(s.publisher)}${s.date ? ', ' + esc(s.date) : ''}</span>
      ${s.note ? `<span class="why">${esc(s.note)}</span>` : ''}</li>`).join('\n');

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: m.full_name, brand: { '@type': 'Brand', name: m.brand },
    category: m.positioning, description: m.og_summary,
    url: `${SITE}/${m.slug}.html`
  };

  return head({
    slug: m.slug,
    title: `${m.full_name} — specs, real range and cost | eTruckTCO`,
    desc: m.og_summary,
    jsonld
  }) + `
<div class="wrap">
  <div class="hero">
    <div class="kicker">${esc(m.positioning)} · ${esc(m.brand)} · introduced ${m.year_introduced}</div>
    <h1>${esc(m.full_name)}</h1>
    <p class="lede">${esc(m.intro)}</p>
  </div>

  ${m.data_quality ? `<div class="card warn"><p style="margin:0"><strong>How solid is this page?</strong> ${esc(m.data_quality.note)}</p></div>` : ''}

  <h2><span class="n">1</span>Key specifications</h2>
  ${specTable}

  <h2><span class="n">2</span>What "range" means here</h2>
  <p>${esc(m.range_note)}</p>
  <div class="card">
    <h3>Three different numbers</h3>
    <ul class="plain">
      <li><span class="ck">1</span><span><strong>Claimed.</strong> ${esc(rd.claimed)}</span></li>
      <li><span class="ck">2</span><span><strong>Loaded.</strong> ${esc(rd.loaded)}</span></li>
      <li><span class="ck">3</span><span><strong>Realistic.</strong> ${esc(rd.realistic)}</span></li>
    </ul>
    <p style="margin:0"><a href="models.html#calculator" style="color:var(--volt-dark);font-weight:700">Work out the range for your own duty →</a></p>
  </div>

  <h2><span class="n">3</span>Charging</h2>
  <p>${esc(m.charging_note)}</p>

  <h2><span class="n">4</span>Price and running cost</h2>
  <p>${esc(m.tco_note)}</p>
  ${priceWarn(m)}

  <h2><span class="n">5</span>Availability and markets</h2>
  <div class="tblwrap"><table>
    <tbody>
      <tr><th>Markets</th><td><span class="val">${(m.markets.value || []).join(' · ')}</span> ${badge(m.markets.confidence)}${m.markets.note ? footnote(m.markets.note) : ''}</td></tr>
      <tr><th>First shown</th><td><span class="val">${esc(m.availability.shown)}</span></td></tr>
      <tr><th>Production</th><td>${esc(m.availability.production)} ${badge(m.availability.confidence)}</td></tr>
    </tbody>
  </table></div>

  <h2><span class="n">6</span>Sources</h2>
  <p>Everything above traces back to one of these. Where a figure is ours rather than theirs, the badge says so and the "why" note explains the arithmetic.</p>
  <ul class="srclist">${sources}</ul>
  <p style="margin-top:14px;font-size:13.5px;color:var(--muted)">Data last reviewed ${esc(DATA.updated)}. The machine-readable version of this page lives in <a href="data/trucks.json" style="color:var(--volt-dark)">data/trucks.json</a>.</p>
</div>
` + FOOT;
}

/* ------------------------------------------------- comparison + calculator */
function modelsPage() {
  const models = DATA.models;
  // Flatten to one row per variant — that is what people actually compare.
  const items = [];
  models.forEach(m => m.variants.forEach(v => items.push({
    id: m.slug + ':' + v.key,
    model: m.slug,
    label: m.brand + ' ' + m.name + (m.variants.length > 1 ? ' · ' + v.label : ''),
    headline: !!v.headline,
    href: m.slug + '.html',
    v: v
  })));

  const cards = models.map(m => {
    const v = m.variants.find(x => x.headline) || m.variants[0];
    return `<a class="card" href="${m.slug}.html" style="text-decoration:none;color:inherit;display:block">
      <div class="kicker">${esc(m.positioning)}</div>
      <h3 style="margin:4px 0 6px;font-size:24px">${esc(m.full_name)}</h3>
      <p style="margin:0 0 10px;font-size:14.5px;color:#534c3d">${esc(m.og_summary)}</p>
      <span style="font-family:var(--cond);font-weight:800;text-transform:uppercase;color:var(--volt-dark)">Full specifications →</span>
    </a>`;
  }).join('\n');

  const payload = JSON.stringify({ items: items, factors: DATA.planning_factors });

  const opts = (arr) => arr.map(o => `<option value="${esc(o.key)}"${o.default ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
  const f = DATA.planning_factors;

  return head({
    slug: 'models',
    title: 'Electric truck specifications compared — MAN eTGX and Windrose R700 | eTruckTCO',
    desc: 'Battery, range, charging and indicative price for long-haul electric trucks, with every figure labelled by how firm it is. Plus a range calculator for your own duty.'
  }) + `
<div class="wrap">
  <div class="hero">
    <div class="kicker">Truck data · reviewed ${esc(DATA.updated)}</div>
    <h1>The trucks,<br>specification by specification</h1>
    <p class="lede">Battery, range, charging and price for the long-haul electric trucks this site models — with every number labelled by where it came from. Manufacturers' claims are marked as claims; our estimates are marked as estimates.</p>
  </div>

  <div class="grid2" style="margin-top:22px">${cards}</div>

  <h2><span class="n">1</span>Compare them side by side</h2>
  <p>Tick up to three. The table redraws as you choose.</p>
  <div class="card" id="picker"></div>
  <div class="tblwrap"><table id="cmp"><caption>Specification comparison</caption></table></div>
  ${LEGEND}

  <h2 id="calculator"><span class="n">2</span>Range calculator</h2>
  <p>Manufacturers quote range under conditions you will not have. This works the other way round: start from the loaded range, then apply what your duty actually looks like. The result is a planning number, not a promise.</p>
  <div class="grid2">
    <div>
      <div class="field">
        <label for="k-truck">Truck</label>
        <select id="k-truck"></select>
      </div>
      <div class="field">
        <label for="k-payload">Payload — how full is it?</label>
        <div class="rowline"><input type="range" id="k-payload" min="0" max="100" step="5" value="100"><span class="rv" id="k-payload-v">100%</span></div>
      </div>
      <div class="field">
        <label for="k-speed">${esc(f.speed.label)}</label>
        <select id="k-speed">${opts(f.speed.options)}</select>
      </div>
      <div class="field">
        <label for="k-temp">${esc(f.temperature.label)}</label>
        <select id="k-temp">${opts(f.temperature.options)}</select>
      </div>
      <div class="field">
        <label for="k-route">${esc(f.route.label)}</label>
        <select id="k-route">${opts(f.route.options)}</select>
      </div>
      <div class="field">
        <label for="k-daily">Distance to cover in a day</label>
        <div class="rowline"><input type="range" id="k-daily" min="150" max="900" step="10" value="450"><span class="rv" id="k-daily-v">450 km</span></div>
      </div>
    </div>
    <div>
      <div class="out">
        <div style="font-family:var(--cond);font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:12.5px;color:#8fd9b6">Range you can plan on</div>
        <div class="big"><span id="k-range">—</span><span class="u">km</span></div>
        <div class="sub" id="k-verdict">Choose a truck to begin.</div>
        <div class="rows">
          <div class="r"><span>Loaded range, starting point</span><b id="k-base">—</b></div>
          <div class="r"><span>Usable before your reserve</span><b id="k-usable">—</b></div>
          <div class="r"><span>Charging stops needed</span><b id="k-stops">—</b></div>
          <div class="r"><span>Time spent charging en route</span><b id="k-time">—</b></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <h3 style="margin-top:0">What this does, exactly</h3>
        <p style="font-size:14px;margin-bottom:8px">It takes the loaded range and multiplies it by four factors: how full the truck is, how fast you drive, how cold it is, and what kind of road. Then it holds back ${Math.round((1 - f.reserve.usable_from_full) * 100)}% as an arrival reserve, because nobody plans to arrive empty.</p>
        <p style="font-size:14px;margin-bottom:0">Every one of those multipliers is <strong>our estimate</strong>, not manufacturer data, and they are deliberately cautious. They live in <a href="data/trucks.json" style="color:var(--volt-dark)">data/trucks.json</a> under <code>planning_factors</code> if you disagree with them.</p>
      </div>
    </div>
  </div>
</div>

<script id="truckdata" type="application/json">${payload}</script>
<script>
(function(){
  var D = JSON.parse(document.getElementById('truckdata').textContent);
  var $ = function(id){ return document.getElementById(id); };
  var F = D.factors;

  function num(f){ if(!f) return null; return (f.value !== undefined) ? f.value : null; }
  function band(f){ if(!f) return null; return (f.min==null&&f.max==null)?null:[f.min,f.max]; }
  // Toont een veld of het nu een enkele waarde of een marge is. money=true zet er euro's voor.
  function show(f, money){
    if (!f) return null;
    if (f.value !== undefined) return f.value == null ? null : (money ? '€'+sp(f.value) : sp(f.value));
    var b = band(f); if (!b) return null;
    if (b[0] == null) return (money ? 'up to €'+sp(b[1]) : 'up to '+sp(b[1]));
    if (b[1] == null) return (money ? 'from €'+sp(b[0]) : 'from '+sp(b[0]));
    return money ? ('€'+sp(b[0])+'–€'+sp(b[1])) : (sp(b[0])+'–'+sp(b[1]));
  }

  /* ---------- comparison table ---------- */
  // Begin met de kopvariant van elk model — MAN tegen Windrose, niet twee MAN-varianten.
  var picked = D.items.filter(function(i){ return i.headline; }).slice(0,3).map(function(i){ return i.id; });
  if (!picked.length) picked = D.items.slice(0,2).map(function(i){ return i.id; });

  function drawPicker(){
    $('picker').innerHTML = D.items.map(function(i){
      var on = picked.indexOf(i.id) >= 0;
      return '<label style="display:inline-flex;align-items:center;gap:7px;margin:0 16px 8px 0;font-size:14.5px">' +
        '<input type="checkbox" data-id="' + i.id + '"' + (on?' checked':'') + '> ' + i.label + '</label>';
    }).join('');
    Array.prototype.forEach.call($('picker').querySelectorAll('input'), function(cb){
      cb.addEventListener('change', function(){
        var id = cb.getAttribute('data-id');
        if (cb.checked) { if (picked.length >= 3) { cb.checked = false; return; } picked.push(id); }
        else picked = picked.filter(function(x){ return x !== id; });
        drawPicker(); drawTable();
      });
    });
  }

  var ROWS = [
    ['Battery capacity',      function(v){ return fmt(num(v.battery_kwh), 'kWh', v.battery_kwh); }],
    ['Range — claimed',       function(v){ return fmt(num(v.range_claimed_km), 'km', v.range_claimed_km); }],
    ['Range — loaded',        function(v){ return fmt(num(v.range_loaded_km), 'km', v.range_loaded_km); }],
    ['Range — realistic',     function(v){ return fmt(show(v.range_realistic_km), 'km', v.range_realistic_km); }],
    ['Power',                 function(v){ return fmt(show(v.power_hp), 'hp', v.power_hp); }],
    ['Charging power, max',   function(v){ return fmt(num(v.charging_mcs_kw_max), 'kW', v.charging_mcs_kw_max); }],
    ['Charge 20–80%',         function(v){ return fmt(num(v.charge_20_80_min), 'min', v.charge_20_80_min); }],
    ['Price',                 function(v){ return fmt(show(v.price_eur, true), '', v.price_eur); }]
  ];
  var BADGES = ${JSON.stringify(BADGE)};
  function sp(n){ return n==null?'—':Number(n).toLocaleString('en-GB').replace(/,/g,' '); }
  function na(){ return '<td class="na">not published</td>'; }
  function fmt(val, unit, f){
    if (val == null) return na();
    var b = BADGES[f && f.confidence];
    var badge = b ? '<span class="badge" style="color:'+b[1]+';background:'+b[2]+'">'+b[0]+'</span>' : '';
    var shown = (typeof val === 'number') ? sp(val) : val;
    return '<td><span class="val">'+shown+(unit?'<span class="unit"> '+unit+'</span>':'')+'</span> '+badge+'</td>';
  }

  function drawTable(){
    var sel = picked.map(function(id){ return D.items.filter(function(i){ return i.id===id; })[0]; }).filter(Boolean);
    if (!sel.length) { $('cmp').innerHTML = '<caption>Specification comparison</caption><tbody><tr><td class="na">Tick at least one truck above.</td></tr></tbody>'; return; }
    var html = '<caption>Specification comparison</caption><thead><tr><th>Specification</th>' +
      sel.map(function(i){ return '<th><a href="'+i.href+'" style="color:#f4efe4">'+i.label+'</a></th>'; }).join('') + '</tr></thead><tbody>';
    ROWS.forEach(function(r){
      html += '<tr><th>'+r[0]+'</th>' + sel.map(function(i){ return r[1](i.v); }).join('') + '</tr>';
    });
    $('cmp').innerHTML = html + '</tbody>';
  }

  /* ---------- range calculator ---------- */
  $('k-truck').innerHTML = D.items.map(function(i){ return '<option value="'+i.id+'">'+i.label+'</option>'; }).join('');

  function factorOf(group, key){
    var o = F[group].options.filter(function(x){ return x.key === key; })[0];
    return o ? o.factor : 1;
  }

  function calc(){
    var item = D.items.filter(function(i){ return i.id === $('k-truck').value; })[0];
    if (!item) return;
    var base = num(item.v.range_loaded_km);
    if (base == null) {
      var b = band(item.v.range_realistic_km);
      base = b ? (b[0]+b[1])/2 : null;
    }
    if (base == null) { $('k-range').textContent='—'; $('k-verdict').textContent='No loaded range published for this truck.'; return; }

    var payload = parseInt($('k-payload').value,10)/100;
    var fPay = 1 + F.payload.empty_bonus * (1 - payload);
    var fSpd = factorOf('speed', $('k-speed').value);
    var fTmp = factorOf('temperature', $('k-temp').value);
    var fRte = factorOf('route', $('k-route').value);

    var R = base * fPay * fSpd * fTmp * fRte;
    var usable = R * F.reserve.usable_from_full;
    var perStop = R * F.en_route_charge.fraction_restored;
    var daily = parseInt($('k-daily').value,10);
    var stops = daily <= usable ? 0 : Math.ceil((daily - usable) / perStop);
    var mins = num(item.v.charge_20_80_min);

    $('k-range').textContent = Math.round(R);
    $('k-base').textContent = Math.round(base) + ' km';
    $('k-usable').textContent = Math.round(usable) + ' km';
    $('k-stops').textContent = stops === 0 ? 'none — one overnight charge' : stops + (stops===1?' stop':' stops');
    $('k-time').textContent = stops === 0 ? '—' : (mins ? (stops*mins) + ' min (' + stops + ' × ' + mins + ')' : 'not published for this truck');
    $('k-verdict').textContent = stops === 0
      ? 'This duty fits on a single overnight charge at your own depot.'
      : 'This duty needs ' + stops + (stops===1?' top-up':' top-ups') + ' on the road.';
  }

  ['k-truck','k-speed','k-temp','k-route'].forEach(function(id){ $(id).addEventListener('change', calc); });
  $('k-payload').addEventListener('input', function(){ $('k-payload-v').textContent = this.value + '%'; calc(); });
  $('k-daily').addEventListener('input', function(){ $('k-daily-v').textContent = this.value + ' km'; calc(); });

  drawPicker(); drawTable(); calc();
})();
</script>
` + FOOT;
}

/* -------------------------------------------------------------- run it */
let written = 0;
DATA.models.forEach(m => {
  const file = path.join(ROOT, m.slug + '.html');
  fs.writeFileSync(file, modelPage(m), 'utf8');
  console.log('  wrote ' + m.slug + '.html');
  written++;
});
fs.writeFileSync(path.join(ROOT, 'models.html'), modelsPage(), 'utf8');
console.log('  wrote models.html');
written++;
console.log('done — ' + written + ' pages from data/trucks.json (reviewed ' + DATA.updated + ')');
