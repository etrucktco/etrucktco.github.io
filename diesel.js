/**
 * The live diesel price, for the three calculators on this site.
 * 23 September 2026.
 *
 * WHY. Until today every page here opened on €1.50 a litre, a figure typed in
 * once and never touched again. A litre of diesel in Belgium cost €2.29 at the
 * pump in the week of 14 September 2026 — €1.89 once a company takes the VAT
 * back — so the page was starting a fifth of a euro below reality and every
 * answer it gave was too kind to diesel.
 *
 * WHERE FROM. eTruckTCO.eu fetches the European Commission's Weekly Oil
 * Bulletin, the official national average published every Thursday, and serves
 * it at https://etrucktco.eu/diesel/prices.json for any site to read. This
 * site has no server of its own — it is files on GitHub Pages — so it reads
 * that address directly.
 *
 * THE SAME RULE AS THERE: nothing waits for the network.
 *
 *   1. the price this browser saw last time is in localStorage and is applied
 *      before the calculator starts. So a returning visitor opens on the price
 *      as of their last visit with no request at all
 *   2. then, and only then, the address above is fetched — the answer is
 *      stored for the next visit, and handed to the page if it asked
 *   3. no localStorage, no network, an address that has moved: the page keeps
 *      the figure written into it and nothing breaks
 *
 * Belgium only, like the rest of this site. The ten-country version lives on
 * eTruckTCO.eu.
 */
(function () {
  'use strict';

  var URL_ = 'https://etrucktco.eu/diesel/prices.json';
  var STORE = 'ettbe-diesel';
  var CODE = 'BE';
  var waiting = [];

  function rowOf(snap) {
    var r = snap && snap.countries && snap.countries[CODE];
    return r && typeof r.exVat === 'number' ? r : null;
  }

  var ETTB = {
    /** The country's figures, or null until one of the two steps below lands. */
    diesel: null,
    /** Be told when a fresher price arrives. fn(row) — row.exVat is the price. */
    onDiesel: function (fn) { if (typeof fn === 'function') waiting.push(fn); },
    /**
     * Go and check the bulletin now, because somebody pressed the button.
     *
     * The ordinary load never waits for the feed. This does: ?refresh=1 makes
     * the Worker on eTruckTCO.eu fetch before it answers. `cache: 'no-store'`
     * matters as much as the parameter — without it a browser can hand back
     * the copy it already has and the button appears to do nothing.
     *
     * Resolves with the row, or null; it never rejects.
     */
    refresh: function () {
      if (typeof fetch !== 'function') return Promise.resolve(null);
      return fetch(URL_ + '?refresh=1', { cache: 'no-store', headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (snap) {
          var row = rowOf(snap);
          if (!row) return null;
          try { localStorage.setItem(STORE, JSON.stringify(snap)); } catch (e) { /* full, or refused */ }
          ETTB.diesel = row;
          return row;
        })
        .catch(function () { return null; });
    },

    /**
     * The "Today's price" button beside a diesel slider.
     *
     * One helper for all three, because the words matter more than the code:
     * the button has to say what it will do before it is pressed and what it
     * found afterwards, and saying that three different ways on three pages is
     * how a visitor stops believing any of it.
     *
     * `apply(row)` is the page's own job — move its slider, redraw its sums.
     * `before()` says what the slider reads at the moment of the press, so a
     * visitor who had dragged the handle to €2.50 is told "updated" and not
     * "already today's" when it jumps back to €1.89.
     */
    today: function (button, apply, before) {
      if (!button) return;
      var IDLE = 'Today’s price';
      var busy = false;

      button.type = 'button';
      button.textContent = IDLE;
      button.title = 'Check the European Commission’s bulletin now and put today’s price on the slider';

      function say(text, ms) {
        button.textContent = text;
        setTimeout(function () { if (!busy) button.textContent = IDLE; }, ms);
      }

      button.addEventListener('click', function () {
        if (busy) return;
        busy = true;
        var was = typeof before === 'function' ? before() : null;
        button.disabled = true;
        button.textContent = 'Checking…';

        ETTB.refresh().then(function (row) {
          busy = false;
          button.disabled = false;
          if (!row) { say('Could not check', 4000); return; }
          try { apply(row); } catch (e) { /* the page's problem, not the button's */ }
          // Something is always said. A button that looks like it did nothing
          // is a button nobody presses twice.
          say(was != null && Math.abs(row.exVat - was) < 0.005 ? 'Already today’s' : 'Updated', 3000);
        });
      });
    },

    /**
     * The sentence under a slider, as elements rather than as a string of
     * HTML: part of it is written by another server.
     */
    note: function (target) {
      if (!target) return;
      var row = ETTB.diesel;
      target.textContent = '';
      if (!row) return;

      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var p = String(row.observedAt || '').split('-');
      var when = p.length === 3 ? (+p[2]) + ' ' + months[+p[1] - 1] + ' ' + p[0] : '';
      function euro(n, d) { return '€' + Number(n).toFixed(d || 2); }
      function bold(text) { var b = document.createElement('b'); b.textContent = text; return b; }

      target.appendChild(bold(euro(row.exVat)));
      if (row.live) {
        target.appendChild(document.createTextNode(
          ' is the Belgian average of ' + euro(row.gross) + ' a litre on ' + when
          + ', without the 21% VAT a company gets back. Take off the ' + euro(row.refund, 4)
          + ' a litre professional hauliers are refunded and it is '));
        target.appendChild(bold(euro(row.afterRefund)));
        target.appendChild(document.createTextNode(', which is what the sums run on. '));
        var a = document.createElement('a');
        a.href = 'https://etrucktco.eu/dieselprices/';
        a.textContent = 'Diesel prices, week by week';
        a.rel = 'noopener';
        target.appendChild(a);
      } else {
        target.appendChild(document.createTextNode(' a litre without VAT, our own figure for now.'));
      }
    },
  };
  window.ETTB = ETTB;

  try {
    var held = localStorage.getItem(STORE);
    if (held) ETTB.diesel = rowOf(JSON.parse(held));
  } catch (e) { /* private window, or something else wrote over the key */ }

  if (typeof fetch === 'function') {
    var before = ETTB.diesel ? ETTB.diesel.exVat : null;
    fetch(URL_, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (snap) {
        var row = rowOf(snap);
        if (!row) return;
        try { localStorage.setItem(STORE, JSON.stringify(snap)); } catch (e) { /* full, or refused */ }
        ETTB.diesel = row;
        if (before != null && Math.abs(row.exVat - before) < 0.0005) return;
        for (var i = 0; i < waiting.length; i++) {
          try { waiting[i](row); } catch (e) { /* one page's bug is not another's */ }
        }
      })
      .catch(function () { /* offline, or eTruckTCO.eu is not answering: keep what we have */ });
  }
})();
