/* Jamari Residences: shared site script.
   Mobile menu · sticky booking bar · residence previews · demo forms ·
   date + guest pickers with a bedrooms switch · the four booking steps (demo: no payment is taken). */
(function () {
  'use strict';

  var RES = window.JAMARI_RESIDENCES || [];
  var WA = 'https://wa.me/2347048200009';
  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ---------------------------------------------------------------- helpers
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function day(v) { return new Date(v + 'T12:00:00'); }
  function fmt(v) { var d = day(v); return DAY[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; }
  function fmtYear(v) { return fmt(v) + ' ' + day(v).getFullYear(); }
  function plusDays(v, n) { var d = day(v); d.setDate(d.getDate() + n); return iso(d); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function naira(n) { return '₦' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var TODAY = iso(new Date());
  function nightsOf(o) { return Math.round((day(o.co) - day(o.ci)) / 86400000); }
  function findRes(slug) { for (var i = 0; i < RES.length; i++) if (RES[i].slug === slug) return RES[i]; return null; }
  function readStay() {
    var p = new URLSearchParams(location.search);
    return { ci: p.get('checkin') || '', co: p.get('checkout') || '', g: parseInt(p.get('guests'), 10) || 0, b: parseInt(p.get('bedrooms'), 10) || 0, t: p.get('type') || '' };
  }
  function stayQuery(o) {
    var p = new URLSearchParams();
    if (o.ci) p.set('checkin', o.ci);
    if (o.co) p.set('checkout', o.co);
    if (o.g) p.set('guests', o.g);
    if (o.t) p.set('type', o.t);
    if (o.b) p.set('bedrooms', o.b);
    return p.toString();
  }
  function datesOk(o) { return !!(o.ci && o.co && o.co > o.ci && o.ci >= TODAY && o.g > 0); }
  function store(key, val) { try { if (val === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null'); sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } }

  // ---------------------------------------------------------------- brand dropdowns + date picker for form fields
  // Each native <select> and <input type="date"> inside a .field keeps its value for the form, but is shown
  // as a brand button that opens the same ivory panel as the home page guests list / calendar.
  var CHEV = '<svg class="ic chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  var CALI = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="3" width="13" height="11.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 6.5h13M5 1.5v3M11 1.5v3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
  var openField = null;
  function closeField(focusBack) {
    if (!openField) return;
    var f = openField; openField = null;
    f.pop.hidden = true; f.btn.setAttribute('aria-expanded', 'false');
    if (focusBack) f.btn.focus();
  }
  document.addEventListener('mousedown', function (e) { if (openField && !openField.wrap.contains(e.target)) closeField(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openField) { e.preventDefault(); closeField(true); } });

  function fieldShell(ctl, icon) {
    var wrap = ctl.closest('.field'), label = wrap.querySelector('label');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'dd-btn'; btn.id = ctl.id + '-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="val"></span>' + icon;
    if (label) label.htmlFor = btn.id;
    ctl.classList.add('native'); ctl.tabIndex = -1; ctl.setAttribute('aria-hidden', 'true');
    var pop = document.createElement('div'); pop.className = 'pop dd-pop'; pop.hidden = true;
    ctl.insertAdjacentElement('afterend', btn); btn.insertAdjacentElement('afterend', pop);
    var self = { wrap: wrap, btn: btn, pop: pop };
    btn.addEventListener('click', function () { if (openField === self) closeField(true); else { closeField(false); openField = self; pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); self.onOpen(); } });
    var form = ctl.form;
    if (form) form.addEventListener('reset', function () { setTimeout(function () { self.refresh(); }, 0); });
    ctl.addEventListener('change', function () { self.refresh(); });
    return self;
  }

  document.querySelectorAll('.field select').forEach(function (sel) {
    var f = fieldShell(sel, CHEV);
    f.btn.setAttribute('aria-haspopup', 'listbox');
    var ph = sel.querySelector('option[value=""]');
    f.pop.innerHTML = (ph ? '<span class="cal-step">' + esc(ph.textContent) + '</span>' : '') + '<ul role="listbox"></ul>';
    var ul = f.pop.querySelector('ul');
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.value === '') return;
      var li = document.createElement('li');
      li.className = 'opt'; li.setAttribute('role', 'option'); li.tabIndex = -1; li.dataset.v = o.value; li.textContent = o.textContent;
      ul.appendChild(li);
    });
    var items = function () { return Array.prototype.slice.call(ul.children); };
    f.refresh = function () {
      var o = sel.options[sel.selectedIndex], empty = !sel.value;
      var val = f.btn.querySelector('.val');
      val.textContent = empty ? (ph ? ph.textContent : '') : o.textContent;
      val.classList.toggle('ph', empty);
      items().forEach(function (li) { li.setAttribute('aria-selected', String(li.dataset.v === sel.value)); });
      if (!empty) f.wrap.classList.remove('err');
    };
    f.onOpen = function () { (ul.querySelector('[aria-selected="true"]') || ul.children[0]).focus(); };
    function choose(v) { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); closeField(true); }
    ul.addEventListener('click', function (e) { var li = e.target.closest('.opt'); if (li) choose(li.dataset.v); });
    ul.addEventListener('keydown', function (e) {
      var list = items(), i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[Math.min(list.length - 1, i + 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list[Math.max(0, i - 1)].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i > -1) choose(list[i].dataset.v); }
    });
    f.refresh();
  });

  document.querySelectorAll('.field input[type="date"]').forEach(function (inp) {
    var f = fieldShell(inp, CALI), placeholder = inp.getAttribute('placeholder') || 'Choose a date';
    f.btn.setAttribute('aria-haspopup', 'dialog');
    f.pop.classList.add('cal', 'dd-cal');
    f.pop.innerHTML = '<div class="cal-head"><span class="cal-step">Choose a date</span><span class="navs">' +
      '<button type="button" class="navbtn" data-m="-1" aria-label="Previous month"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>' +
      '<button type="button" class="navbtn" data-m="1" aria-label="Next month"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button></span></div>' +
      '<div class="cal-months"></div><div class="cal-foot"><span class="cal-sum"></span><button type="button" class="txtbtn">Clear</button></div>';
    var months = f.pop.querySelector('.cal-months'), now = new Date(), FIRST = new Date(now.getFullYear(), now.getMonth(), 1), view = FIRST;
    function render() {
      var m = view, html = '<div class="month"><p class="mname">' + MONTH[m.getMonth()] + ' ' + m.getFullYear() + '</p><div class="wk" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="days">';
      var lead = (m.getDay() + 6) % 7, last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (var i = 0; i < lead; i++) html += '<span></span>';
      for (var d = 1; d <= last; d++) {
        var v = iso(new Date(m.getFullYear(), m.getMonth(), d));
        html += '<button type="button" class="day' + (v === TODAY ? ' today' : '') + (v === inp.value ? ' start' : '') + '" data-v="' + v + '" aria-label="' + fmtYear(v) + '"' + (v < TODAY ? ' disabled' : '') + '>' + d + '</button>';
      }
      months.innerHTML = html + '</div></div>';
      f.pop.querySelector('[data-m="-1"]').disabled = view <= FIRST;
      f.pop.querySelector('.cal-sum').innerHTML = inp.value ? '<b>' + fmtYear(inp.value) + '</b>' : 'No date yet';
    }
    f.refresh = function () {
      var val = f.btn.querySelector('.val');
      val.textContent = inp.value ? fmt(inp.value) : placeholder;
      val.classList.toggle('ph', !inp.value);
      if (inp.value) f.wrap.classList.remove('err');
    };
    f.onOpen = function () {
      var a = inp.value ? day(inp.value) : now; view = new Date(a.getFullYear(), a.getMonth(), 1); if (view < FIRST) view = FIRST;
      render();
      var b = months.querySelector('.day.start') || months.querySelector('.day.today') || months.querySelector('.day:not(:disabled)');
      if (b) b.focus();
    };
    f.pop.querySelectorAll('[data-m]').forEach(function (b) { b.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + (+b.dataset.m), 1); render(); }); });
    f.pop.querySelector('.txtbtn').addEventListener('click', function () { inp.value = ''; inp.dispatchEvent(new Event('change', { bubbles: true })); render(); });
    months.addEventListener('click', function (e) {
      var b = e.target.closest('.day'); if (!b || b.disabled) return;
      inp.value = b.dataset.v; inp.dispatchEvent(new Event('change', { bubbles: true })); closeField(true);
    });
    months.addEventListener('keydown', function (e) {
      var b = e.target.closest('.day'); if (!b) return;
      var move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!move) return;
      e.preventDefault();
      var v = plusDays(b.dataset.v, move); if (v < TODAY) return;
      var t = months.querySelector('[data-v="' + v + '"]');
      if (!t) { var d2 = day(v); view = new Date(d2.getFullYear(), d2.getMonth(), 1); render(); t = months.querySelector('[data-v="' + v + '"]'); }
      if (t) t.focus();
    });
    f.refresh();
  });

  // ---------------------------------------------------------------- mobile menu
  var menu = document.getElementById('menu'), openBtn = document.querySelector('.menu-btn');
  if (menu && openBtn) {
    var setMenu = function (open) {
      menu.hidden = !open; openBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) menu.querySelector('.close').focus(); else openBtn.focus();
    };
    openBtn.addEventListener('click', function () { setMenu(true); });
    menu.querySelector('.close').addEventListener('click', function () { setMenu(false); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { menu.hidden = true; document.body.style.overflow = ''; }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  }

  // ---------------------------------------------------------------- top bar: hides while you read down, comes back when you scroll up
  (function () {
    var bar = document.querySelector('.topbar'), float = false;
    var heroNav = !bar && document.querySelector('.band .nav');
    if (heroNav) {  // home and photo-led pages: a light copy of the nav that slides in once the photo is gone
      float = true;
      bar = document.createElement('header'); bar.className = 'topbar float';
      var w = document.createElement('div'); w.className = 'wrap'; bar.appendChild(w);
      var nav = heroNav.cloneNode(true); nav.removeAttribute('id'); w.appendChild(nav);
      var wm = nav.querySelector('.wm'); if (wm) wm.style.setProperty('--wm', 'var(--green)');
      var mb = nav.querySelector('.menu-btn'); if (mb && openBtn) mb.addEventListener('click', function () { openBtn.click(); });
      bar.inert = true;
      document.body.insertBefore(bar, document.body.firstChild);
    }
    if (!bar) return;
    var lastY = window.scrollY, ticking = false, hero = heroNav ? heroNav.closest('.band') : null;
    function update() {
      ticking = false;
      var y = window.scrollY, d = y - lastY;
      if (Math.abs(d) < 6) return;
      var up = d < 0;
      if (float) {
        var show = up && y > (hero ? hero.offsetHeight * 0.7 : 400);
        bar.classList.toggle('up', show); bar.inert = !show;
      } else if (y < bar.offsetHeight + 40) { bar.classList.remove('away', 'up'); }
      else { bar.classList.toggle('away', !up); bar.classList.toggle('up', up); }
      lastY = y;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  })();

  // ---------------------------------------------------------------- content eases in as it scrolls into view (off for reduced motion)
  if ('IntersectionObserver' in window && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.sec-head, .res-row, .card, .rooms, .intro .grid, .faq-group, .legal-row, .room-body, .more-photos, .inc .grid, .pair, .reviews .wrap, .next-steps, .team-stats, .pick-list')
      .forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('rv'); io.observe(el); } });
  }

  // ---------------------------------------------------------------- sticky booking bar (phones)
  var sticky = document.querySelector('.sticky'), anchor = document.getElementById('book');
  if (sticky && anchor && 'IntersectionObserver' in window) {
    sticky.classList.add('away');
    new IntersectionObserver(function (es) { sticky.classList.toggle('away', es[0].isIntersecting); }).observe(anchor);
  }

  // ---------------------------------------------------------------- home: hovering a residence swaps the photo
  var preview = document.querySelector('.preview');
  if (preview) {
    var rooms = document.querySelectorAll('.room'), pics = preview.querySelectorAll('img'), ptext = preview.querySelector('p');
    var show = function (r) {
      rooms.forEach(function (x) { x.classList.toggle('on', x === r); });
      pics.forEach(function (p) { p.classList.toggle('on', p.dataset.photo === r.dataset.photo); });
      if (ptext) ptext.textContent = r.dataset.line || '';
    };
    rooms.forEach(function (r) { r.addEventListener('mouseenter', function () { show(r); }); r.addEventListener('focusin', function () { show(r); }); });
  }

  // ---------------------------------------------------------------- demo forms (nothing is sent)
  document.querySelectorAll('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      f.querySelectorAll('[required]').forEach(function (el) {
        var ok = el.type === 'checkbox' ? el.checked : (el.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) : !!el.value.trim());
        var wrap = el.closest('.field') || el.closest('.check');
        if (wrap) wrap.classList.toggle('err', !ok);
        if (!ok && !bad) bad = el;
      });
      var out = f.querySelector('.thanks-msg') || f.parentElement.querySelector('.thanks-msg');
      if (bad) { (bad.classList.contains('native') ? bad.nextElementSibling : bad).focus(); if (out) { out.hidden = true; } return; }
      if (out) { out.hidden = false; out.textContent = f.dataset.demo; }
      f.reset();
    });
  });

  // ---------------------------------------------------------------- booking by bedrooms (DEMO availability)
  // Guests book 1, 2 or 3 bedrooms; the residence is assigned at payment, smallest fit first
  // (penthouses take 1–2 bedroom stays first, so the 3-bedroom apartments stay free for groups).
  // Availability below is SAMPLE data, counted in nights from today, so the calendar always shows some booked nights.
  var SIZES = window.JAMARI_SIZES || [], TYPES = window.JAMARI_TYPES || [];
  function typeOf(t) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].slug === t) return TYPES[i]; return null; }
  function needBeds(g) { for (var i = 0; i < SIZES.length; i++) if (SIZES[i].guests >= g) return SIZES[i].beds; return 99; }
  function stayName(T, b) { return T.name + ' · ' + bedWord(b); }
  function sizeOf(b) { for (var i = 0; i < SIZES.length; i++) if (SIZES[i].beds === b) return SIZES[i]; return null; }
  function bedWord(b) { return b + (b === 1 ? ' bedroom' : ' bedrooms'); }
  var DEMO_BUSY = { 'penthouse-101': [[5, 8], [20, 23]], 'penthouse-102': [[5, 9], [12, 14]], 'apartment-101': [[6, 8], [12, 15]],
    'apartment-102': [[5, 8], [12, 15], [30, 33]], 'apartment-103': [[6, 8], [12, 15], [21, 24]], 'apartment-104': [[5, 9], [12, 14], [20, 23]] };
  function offset(v) { return Math.round((day(v) - day(TODAY)) / 86400000); }
  function busy(slug, v) { var o = offset(v), a = DEMO_BUSY[slug] || []; for (var i = 0; i < a.length; i++) if (o >= a[i][0] && o < a[i][1]) return true; return false; }
  function fitting(b, t) { return RES.filter(function (r) { return r.beds >= (b || 1) && (!t || r.kind === t); }).sort(function (x, y) { return x.beds - y.beds; }); }
  function nightOpen(b, v, t) { return fitting(b, t).some(function (r) { return !busy(r.slug, v); }); }
  function assign(b, ci, co, t) {  // smallest free unit of that type for every night, or null
    var list = fitting(b, t);
    for (var i = 0; i < list.length; i++) {
      var ok = true;
      for (var v = ci; v < co; v = plusDays(v, 1)) if (busy(list[i].slug, v)) { ok = false; break; }
      if (ok) return list[i];
    }
    return null;
  }

  // ---------------------------------------------------------------- booking line: brand date + guest pickers
  function initBooking(form) {
    var q = function (s) { return form.querySelector(s); };
    var btn = q('.cta'), hint = q('.hint');
    var slotIn = q('.slot-in'), slotOut = q('.slot-out'), slotG = q('.slot-guests');
    var cal = q('.cal'), months = q('.cal-months'), step = q('.cal-step'), sum = q('.cal-sum'), note = q('.cal-note');
    var prev = q('.cal-prev'), next = q('.cal-next'), gPop = q('.guest-pop'), gList = q('.guest-list');
    var sizeBtns = Array.prototype.slice.call(form.querySelectorAll('.size-switch button'));
    var start = readStay();
    var S = { ci: start.ci >= TODAY ? start.ci : '', co: '', g: start.g || 0, b: start.b || parseInt(form.dataset.beds, 10) || 0, t: form.dataset.type || start.t || '' }, mode = 'in', opener = null;
    var TT = typeOf(S.t), maxB = TT ? TT.maxBeds : 3;
    if (S.b > maxB) S.b = maxB;
    sizeBtns.forEach(function (b) { if (+b.dataset.b > maxB) b.hidden = true; });
    if (S.ci && start.co > S.ci) S.co = start.co;
    var maxGuests = parseInt(form.dataset.max, 10) || 6;
    if (S.g > maxGuests) S.g = 0;
    var now = new Date(), FIRST = new Date(now.getFullYear(), now.getMonth(), 1), view = FIRST;
    var nights = function () { return nightsOf(S); };
    function limit() {  // first fully booked night after check-in: the latest possible check-out
      if (!S.ci) return '';
      for (var v = plusDays(S.ci, 1), k = 0; k < 120; v = plusDays(v, 1), k++) if (!nightOpen(S.b, v, S.t)) return v;
      return '';
    }

    function renderCal() {
      var count = window.innerWidth < 700 ? 1 : 2, html = '', lim = mode === 'out' ? limit() : '';
      for (var k = 0; k < count; k++) {
        var m = new Date(view.getFullYear(), view.getMonth() + k, 1);
        html += '<div class="month"><p class="mname">' + MONTH[m.getMonth()] + ' ' + m.getFullYear() + '</p><div class="wk" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="days">';
        var lead = (m.getDay() + 6) % 7, last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        for (var i = 0; i < lead; i++) html += '<span></span>';
        for (var d = 1; d <= last; d++) {
          var v = iso(new Date(m.getFullYear(), m.getMonth(), d)), cls = 'day', open = v >= TODAY && nightOpen(S.b, v, S.t), off;
          if (mode === 'out' && S.ci && v > S.ci) off = !!(lim && v > lim);
          else off = v < TODAY || !open;
          if (v >= TODAY && !open && !(mode === 'out' && v === lim)) cls += ' full';
          if (v === TODAY) cls += ' today';
          if (v === S.ci) cls += ' start';
          if (v === S.co) cls += ' end';
          if (S.ci && S.co && v > S.ci && v < S.co) cls += ' in';
          html += '<button type="button" class="' + cls + '" data-v="' + v + '" aria-label="' + fmtYear(v) + (cls.indexOf('full') > -1 ? ', booked' : '') + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (v === S.ci || v === S.co) + '">' + d + '</button>';
        }
        html += '</div></div>';
      }
      months.innerHTML = html;
      prev.disabled = view <= FIRST;
      step.textContent = mode === 'in' ? 'Choose your check-in date' : 'Now choose your check-out date';
      sum.innerHTML = S.ci ? '<b>' + fmt(S.ci) + '</b> – ' + (S.co ? '<b>' + fmt(S.co) + '</b> · ' + plural(nights(), 'night') : '…') : 'No dates yet';
      sizeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.b === S.b)); });
      var what = (TT ? TT.name.toLowerCase() : 'residence') + (S.b ? ' with ' + bedWord(S.b) : '');
      if (note) note.textContent = 'Struck-through nights have no ' + what + ' free.' + (S.b ? '' : ' Choose a number of bedrooms to see its dates.') + ' [Demo: sample availability.]';
    }
    sizeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        S.b = S.b === +b.dataset.b ? 0 : +b.dataset.b;
        if (S.ci && !nightOpen(S.b, S.ci, S.t)) { S.ci = ''; S.co = ''; mode = 'in'; }
        else if (S.co) { var l = limit(); if (l && S.co > l) { S.co = ''; mode = 'out'; } }
        renderCal(); sync();
      });
    });
    function paintPreview(hover) {
      months.querySelectorAll('.day').forEach(function (b) {
        var v = b.dataset.v, on = mode === 'out' && S.ci && !S.co && hover && hover > S.ci;
        b.classList.toggle('in', on ? (v > S.ci && v < hover) : !!(S.ci && S.co && v > S.ci && v < S.co));
        b.classList.toggle('hover-end', !!(on && v === hover));
      });
    }
    function focusDay(v) {
      var b = months.querySelector('[data-v="' + v + '"]');
      if (!b) {
        var d = day(v), mv = new Date(d.getFullYear(), d.getMonth(), 1);
        view = (mv > view && window.innerWidth >= 700) ? new Date(mv.getFullYear(), mv.getMonth() - 1, 1) : mv;
        if (view < FIRST) view = FIRST;
        renderCal(); b = months.querySelector('[data-v="' + v + '"]');
      }
      if (b && !b.disabled) b.focus();
      else { var f = months.querySelector('.day:not(:disabled)'); if (f) f.focus(); }
    }
    function pick(v) {
      if (mode === 'in' || !S.ci || v <= S.ci) { S.ci = v; S.co = ''; mode = 'out'; renderCal(); focusDay(plusDays(v, 1)); }
      else { S.co = v; mode = 'in'; renderCal(); setTimeout(function () { close(true); }, 280); }
      sync();
    }
    months.addEventListener('click', function (e) { var b = e.target.closest('.day'); if (b && !b.disabled) pick(b.dataset.v); });
    months.addEventListener('mouseover', function (e) { var b = e.target.closest('.day'); if (b && !b.disabled) paintPreview(b.dataset.v); });
    months.addEventListener('mouseleave', function () { paintPreview(''); });
    months.addEventListener('keydown', function (e) {
      var b = e.target.closest('.day'); if (!b) return;
      var move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!move) return;
      e.preventDefault();
      var v = plusDays(b.dataset.v, move);
      if (v >= TODAY) focusDay(v);
    });
    prev.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
    next.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });
    q('.cal-clear').addEventListener('click', function () { S.ci = ''; S.co = ''; mode = 'in'; renderCal(); sync(); });

    for (var n = 1; n <= maxGuests; n++) {
      var li = document.createElement('li');
      li.className = 'opt'; li.setAttribute('role', 'option'); li.tabIndex = -1; li.dataset.n = n; li.textContent = plural(n, 'guest');
      li.setAttribute('aria-selected', String(n === S.g));
      gList.appendChild(li);
    }
    var opts = function () { return Array.prototype.slice.call(gList.children); };
    function chooseGuests(n) { S.g = n; opts().forEach(function (o) { o.setAttribute('aria-selected', String(+o.dataset.n === n)); }); sync(); close(true); }
    gList.addEventListener('click', function (e) { var o = e.target.closest('.opt'); if (o) chooseGuests(+o.dataset.n); });
    gList.addEventListener('keydown', function (e) {
      var list = opts(), i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[Math.min(list.length - 1, i + 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list[Math.max(0, i - 1)].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i > -1) chooseGuests(+list[i].dataset.n); }
    });

    function place(pop, slot) {
      var f = form.getBoundingClientRect(), r = slot.getBoundingClientRect();
      pop.style.top = (r.bottom - f.top + 10) + 'px';
      if (window.innerWidth < 700) { pop.style.left = '0px'; return; }
      var w = pop.offsetWidth, x = Math.min(Math.max(r.left, 16), window.innerWidth - w - 16);
      pop.style.left = (x - f.left) + 'px';
    }
    function open(which) {
      close(false);
      opener = which === 'g' ? slotG : (which === 'out' ? slotOut : slotIn);
      opener.setAttribute('aria-expanded', 'true');
      if (which === 'g') {
        gPop.hidden = false; place(gPop, slotG);
        (gList.querySelector('[aria-selected="true"]') || gList.children[Math.min(1, gList.children.length - 1)]).focus();
      } else {
        mode = which === 'out' && S.ci ? 'out' : 'in';
        var a = day(mode === 'out' ? S.ci : (S.ci || TODAY));
        view = new Date(a.getFullYear(), a.getMonth(), 1); if (view < FIRST) view = FIRST;
        cal.hidden = false; renderCal(); place(cal, opener);
        focusDay(mode === 'out' ? (S.co || plusDays(S.ci, 1)) : (S.ci || TODAY));
      }
    }
    function close(returnFocus) {
      var was = opener;
      cal.hidden = true; gPop.hidden = true;
      [slotIn, slotOut, slotG].forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      opener = null;
      if (returnFocus && was) was.focus();
    }
    slotIn.addEventListener('click', function () { slotIn.getAttribute('aria-expanded') === 'true' ? close(true) : open('in'); });
    slotOut.addEventListener('click', function () { slotOut.getAttribute('aria-expanded') === 'true' ? close(true) : open('out'); });
    slotG.addEventListener('click', function () { slotG.getAttribute('aria-expanded') === 'true' ? close(true) : open('g'); });
    document.addEventListener('mousedown', function (e) { if (opener && !form.contains(e.target)) close(false); else if (opener && !e.target.closest('.pop') && !e.target.closest('.slot')) close(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && opener) { e.preventDefault(); close(true); } });
    window.addEventListener('resize', function () { if (!cal.hidden) { renderCal(); place(cal, opener); } else if (!gPop.hidden) place(gPop, slotG); });

    function setSlot(slot, text) {
      var val = slot.querySelector('.val');
      val.textContent = text || val.dataset.ph;
      slot.classList.toggle('filled', !!text);
      if (text) slot.classList.remove('missing');
    }
    function ready() { return !!(S.ci && S.co && S.g); }
    function sync() {
      setSlot(slotIn, S.ci ? fmt(S.ci) : '');
      setSlot(slotOut, S.co ? fmt(S.co) : '');
      setSlot(slotG, S.g ? plural(S.g, 'guest') : '');
      var ok = ready();
      btn.classList.toggle('ready', ok);
      if (ok) {
        hint.innerHTML = '<b>' + fmt(S.ci) + ' – ' + fmt(S.co) + '</b> · ' + plural(nights(), 'night') + ' · ' + plural(S.g, 'guest') + (S.b ? ' · ' + bedWord(S.b) : '');
      } else {
        var miss = [];
        if (!S.ci) miss.push('check-in date');
        if (!S.co) miss.push('check-out date');
        if (!S.g) miss.push('number of guests');
        hint.textContent = miss.length === 3 ? 'Pick your dates and number of guests.' : 'Now pick your ' + miss.join(' and ') + '.';
      }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ready()) {
        if (!S.ci) slotIn.classList.add('missing');
        if (!S.co) slotOut.classList.add('missing');
        if (!S.g) slotG.classList.add('missing');
        sync();
        open(!S.ci ? 'in' : !S.co ? 'out' : 'g');
        return;
      }
      close(false);
      var stay = { ci: S.ci, co: S.co, g: S.g, b: S.b, t: S.t };
      if (form.dataset.go) { location.href = form.dataset.go + '?' + stayQuery(stay); return; }
      history.replaceState(null, '', '?' + stayQuery(stay));
      document.dispatchEvent(new CustomEvent('jamari:stay', { detail: stay }));
    });
    sync();
  }
  document.querySelectorAll('form.booking').forEach(initBooking);

  // ---------------------------------------------------------------- booking flow pages (DEMO: no payment is taken)
  var page = document.body.dataset.page;
  var HOLD_MS = 15 * 60000;
  function clock(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function sameStay(h, s) { return h && h.ci === s.ci && h.co === s.co && h.b === s.b && h.t === s.t; }
  function newHold(s) { var h = { ci: s.ci, co: s.co, b: s.b, t: s.t, until: Date.now() + HOLD_MS }; store('jamari-hold', h); return h; }
  function getHold(s) { var h = store('jamari-hold'); return sameStay(h, s) ? h : null; }
  function holdText(c, h) { return 'Your ' + c.T.name.toLowerCase() + ' with ' + bedWord(c.z.beds) + ' is held for you for 15 minutes, until ' + clock(h.until) + '. Pay before then to keep it.'; }

  function summaryHTML(stay, z, r, T) {
    var n = nightsOf(stay);
    return '<img src="assets/img/' + (r ? r.photo : T.photo) + '.jpg" alt="">' +
      '<div><span class="label">' + (r ? bedWord(z.beds) + ' · your residence' : 'Your stay') + '</span><h2>' + (r ? esc(r.name) : esc(stayName(T, z.beds))) + '</h2></div>' +
      '<ul class="rows plain">' +
      '<li><span>Dates</span><span>' + fmt(stay.ci) + ' – ' + fmtYear(stay.co) + '</span></li>' +
      '<li><span>Nights</span><span>' + n + '</span></li>' +
      '<li><span>Guests</span><span>' + plural(stay.g, 'guest') + '</span></li>' +
      '<li><span>Bedrooms</span><span>' + z.beds + '</span></li>' +
      '<li><span>Rate</span><span>' + naira(z.price) + ' × ' + plural(n, 'night') + '</span></li>' +
      '<li><span>Check-in</span><span>From 2 pm</span></li><li><span>Check-out</span><span>By 12 pm</span></li>' +
      '</ul><div class="total"><span>' + (r ? 'Paid' : 'Total') + '</span><span>' + naira(z.price * n) + '</span></div>' +
      (r ? '' : '<p class="note">Your residence number is on your confirmation.' + (z.beds < T.maxBeds ? ' Bedrooms you don’t book stay locked.' : '') + '</p>') +
      '<p class="note">Card, bank transfer or USSD, through Paystack. Charged in naira.</p>';
  }
  function missingHTML(text) {
    return '<div class="flow-missing"><p>' + text + '</p><a class="btn inline" href="book.html">Choose your dates</a></div>';
  }
  function flowGuard(r) {
    var stay = readStay(), z = sizeOf(stay.b), T = typeOf(stay.t);
    if (!datesOk(stay) || !z || !T || z.beds > T.maxBeds || stay.g > z.guests) {
      var main = document.querySelector('.flow-main'), side = document.querySelector('.summary');
      if (main) main.innerHTML = missingHTML('Your booking details are missing or out of date. Start again with your dates, guests and residence.');
      if (side) side.hidden = true;
      return null;
    }
    document.querySelectorAll('.stepper a').forEach(function (a) { a.href = a.getAttribute('href').split('?')[0] + '?' + stayQuery(stay); });
    var side2 = document.querySelector('.summary');
    if (side2) side2.innerHTML = summaryHTML(stay, z, r, T);
    return { stay: stay, z: z, T: T };
  }
  function showHold(c, h) { var el = document.getElementById('hold'); if (el) { el.textContent = holdText(c, h); el.hidden = false; } }

  // step 1: dates, residence type and bedrooms
  if (page === 'book') {
    var list = document.getElementById('pick-list'), head = document.getElementById('pick-head'), CH = {}, last = readStay();
    var renderPicks = function (stay) {
      last = stay;
      var ok = datesOk(stay), n = ok ? nightsOf(stay) : 0, need = stay.g ? needBeds(stay.g) : 1;
      head.innerHTML = ok
        ? 'For <b>' + fmt(stay.ci) + ' – ' + fmt(stay.co) + '</b> · ' + plural(n, 'night') + ' · ' + plural(stay.g, 'guest') + '. Prices are per night.'
        : 'Choose your dates and guests above to see the price for your stay.';
      list.innerHTML = TYPES.map(function (T) {
        var fits = need <= T.maxBeds;
        var b = CH[T.slug] || (stay.t === T.slug && stay.b ? stay.b : (stay.b && stay.b <= T.maxBeds ? stay.b : T.maxBeds));
        b = Math.min(Math.max(b, need), T.maxBeds); CH[T.slug] = b;
        var z = sizeOf(b), sel = stay.t === T.slug, free = ok && fits ? assign(b, stay.ci, stay.co, T.slug) : null;
        var beds = '';
        for (var k = 1; k <= T.maxBeds; k++) beds += '<button type="button" data-t="' + T.slug + '" data-b="' + k + '" aria-pressed="' + (k === b) + '"' + (k < need ? ' disabled' : '') + ' aria-label="' + bedWord(k) + '">' + k + '</button>';
        var price = ok ? '<b>' + naira(z.price * n) + '</b><small>' + naira(z.price) + ' × ' + plural(n, 'night') + '</small>' : '<b>' + naira(z.price) + '</b><small>per night</small>';
        var q = stayQuery({ ci: stay.ci, co: stay.co, g: stay.g, b: b, t: T.slug });
        var act = !fits ? '<small>Sleeps up to ' + sizeOf(T.maxBeds).guests + '</small>'
          : !ok ? '<small>Pick dates first</small>'
          : free ? '<a class="btn' + (sel ? '' : ' ghost') + '" data-hold="' + T.slug + '" href="book-details.html?' + q + '">Select</a>'
          : '<span class="chip chip-cancelled">Not free for these dates</span><a class="see-dates" href="' + T.url + '?' + stayQuery({ g: stay.g, b: b }) + '#book">See free dates</a>';
        return '<article class="pick' + (sel ? ' sel' : '') + (fits && (!ok || free) ? '' : ' off') + '">' +
          '<img src="assets/img/' + T.photo + '.jpg" alt="" loading="lazy">' +
          '<div><span class="label">Up to ' + sizeOf(T.maxBeds).guests + ' guests' + (sel ? ' · your choice' : '') + '</span><h3>' + esc(T.name) + '</h3><span class="spec">' + esc(T.where) + '</span>' +
          (fits ? '<div class="bed-pick" role="group" aria-label="Bedrooms in the ' + esc(T.name.toLowerCase()) + '"><span class="label">Bedrooms</span>' + beds + '</div>' : '') + '</div>' +
          '<div class="side">' + (ok && fits && !free ? '' : price) + act + '</div></article>';
      }).join('');
    };
    list.addEventListener('click', function (e) {
      var bb = e.target.closest('.bed-pick button');
      if (bb) { CH[bb.dataset.t] = +bb.dataset.b; renderPicks(last); var f = list.querySelector('[data-t="' + bb.dataset.t + '"][data-b="' + bb.dataset.b + '"]'); if (f) f.focus(); return; }
      var a = e.target.closest('[data-hold]'); if (!a) return;
      var s = readStay(); s.t = a.dataset.hold; s.b = CH[s.t]; newHold(s);
    });
    renderPicks(readStay());
    document.addEventListener('jamari:stay', function (e) { CH = {}; renderPicks(e.detail); });
  }

  // step 2: guest details
  if (page === 'book-details') {
    var ctx = flowGuard(), f2 = document.getElementById('details-form');
    if (ctx && f2) {
      showHold(ctx, getHold(ctx.stay) || newHold(ctx.stay));
      var saved = store('jamari-guest') || {};
      Object.keys(saved).forEach(function (k) { var el = f2.elements[k]; if (el) { if (el.type === 'checkbox') el.checked = !!saved[k]; else { el.value = saved[k]; el.dispatchEvent(new Event('change')); } } });
      f2.querySelector('.back').href = 'book.html?' + stayQuery(ctx.stay);
      f2.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = null, data = {};
        Array.prototype.forEach.call(f2.elements, function (el) {
          if (!el.name) return;
          data[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
          if (!el.required) return;
          var ok = el.type === 'checkbox' ? el.checked : (el.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) : !!el.value.trim());
          var wrap = el.closest('.field') || el.closest('.check');
          if (wrap) wrap.classList.toggle('err', !ok);
          if (!ok && !bad) bad = el;
        });
        if (bad) { (bad.classList.contains('native') ? bad.nextElementSibling : bad).focus(); return; }
        store('jamari-guest', data);
        location.href = 'book-pay.html?' + stayQuery(ctx.stay);
      });
    }
  }

  // step 3: review and pay (demo payment window)
  if (page === 'book-pay') {
    var c3 = flowGuard(), g3 = store('jamari-guest');
    if (c3 && !g3) document.querySelector('.flow-main').innerHTML = missingHTML('We need your details before payment. Go back one step.');
    else if (c3) {
      var n3 = nightsOf(c3.stay), q3 = stayQuery(c3.stay), total3 = naira(c3.z.price * n3);
      var h3 = getHold(c3.stay) || newHold(c3.stay);
      var noticeEl = document.getElementById('pay-notice'), holdEl = document.getElementById('hold');
      var notice = function (title, text) { noticeEl.innerHTML = '<h2>' + title + '</h2><p>' + text + '</p>'; noticeEl.hidden = false; holdEl.hidden = true; noticeEl.scrollIntoView({ block: 'center' }); };
      showHold(c3, h3);
      document.getElementById('review').innerHTML =
        '<li><span>Residence</span><span>' + esc(stayName(c3.T, c3.z.beds)) + ' · <a href="book.html?' + q3 + '">Change</a></span></li>' +
        '<li><span>Residence number</span><span>On your confirmation</span></li>' +
        '<li><span>Dates</span><span>' + fmt(c3.stay.ci) + ' – ' + fmtYear(c3.stay.co) + ' · ' + plural(n3, 'night') + ' · <a href="book.html?' + q3 + '">Change</a></span></li>' +
        '<li><span>Guests</span><span>' + plural(c3.stay.g, 'guest') + '</span></li>' +
        '<li><span>Lead guest</span><span>' + esc(g3.name) + ' · ' + esc(g3.phone) + ' · <a href="book-details.html?' + q3 + '">Edit</a></span></li>' +
        '<li><span>Check-in / out</span><span>From 2 pm / by 12 pm</span></li>';
      var payBtn = document.getElementById('pay-btn'), f3 = document.getElementById('pay-form');
      payBtn.textContent = 'Pay ' + total3 + ' securely';
      f3.querySelector('.back').href = 'book-details.html?' + q3;
      var modal = document.getElementById('pay-modal');
      document.getElementById('pm-email').textContent = g3.email || '';
      document.getElementById('pm-amount').textContent = 'Pay NGN ' + total3.slice(1);
      document.getElementById('pm-pay').textContent = 'Pay NGN ' + total3.slice(1);
      var closeModal = function () { modal.hidden = true; document.body.style.overflow = ''; };
      f3.addEventListener('submit', function (e) {
        e.preventDefault();
        var terms = document.getElementById('terms');
        terms.closest('.check').classList.toggle('err', !terms.checked);
        if (!terms.checked) { terms.focus(); return; }
        var h = getHold(c3.stay);
        if (!h || h.until < Date.now()) {
          notice('Your 15 minutes ran out.', 'We released your ' + c3.T.name.toLowerCase() + ' so others can book. Nothing was charged. ' +
            (assign(c3.z.beds, c3.stay.ci, c3.stay.co, c3.T.slug) ? 'It is still free for these dates: press pay again to hold it for another 15 minutes.' : 'It has since been booked. <a href="book.html?' + q3 + '">Choose other dates</a>.'));
          newHold(c3.stay); return;
        }
        modal.hidden = false; document.body.style.overflow = 'hidden'; document.getElementById('pm-pay').focus();
      });
      document.getElementById('pm-x').addEventListener('click', function () {
        closeModal();
        notice('Payment not completed.', 'Nothing was charged. Your ' + c3.T.name.toLowerCase() + ' is still held for you until ' + clock(getHold(c3.stay).until) + ', so you can try again or use another payment method.');
        payBtn.textContent = 'Try paying again';
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) document.getElementById('pm-x').click(); });
      document.getElementById('pm-pay').addEventListener('click', function () {
        var r = assign(c3.z.beds, c3.stay.ci, c3.stay.co, c3.T.slug);
        if (!r) { closeModal(); notice('Sorry, these dates just went.', 'The last ' + c3.T.name.toLowerCase() + ' was booked while you were paying. If any money left your account, Paystack refunds it in full. <a href="book.html?' + q3 + '">Choose other dates</a>.'); return; }
        var ref = 'JR-' + String(Math.floor(Math.random() * 900000) + 100000);
        store('jamari-hold', null);
        location.href = 'book-confirmed.html?' + q3 + '&ref=' + ref + '&res=' + r.slug;
      });
    }
  }

  // step 4: confirmed (paid)
  if (page === 'book-confirmed') {
    var p4 = new URLSearchParams(location.search), r4 = findRes(p4.get('res') || '');
    var c4 = flowGuard(r4), g4 = store('jamari-guest') || {};
    if (c4 && r4) {
      var ref = p4.get('ref') || 'JR-demo', paid4 = naira(c4.z.price * nightsOf(c4.stay));
      var where = r4.name + (c4.z.beds < c4.T.maxBeds ? ', with ' + bedWord(c4.z.beds) + ' open for you (' + (c4.T.maxBeds - c4.z.beds === 1 ? 'the other bedroom stays' : 'the other bedrooms stay') + ' locked)' : '');
      document.getElementById('who').textContent = (g4.name || 'friend').split(' ')[0] + '.';
      document.getElementById('ref').textContent = 'Paid ' + paid4 + ' · Booking ' + ref + ' · ' + r4.name;
      document.getElementById('sent').textContent = 'Your booking is confirmed and paid. You’re in ' + where + '. We’ve emailed the details to ' + (g4.email || 'you') + ', and Paystack has sent your receipt. [Demo: no payment was taken and no email was sent.]';
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jamari Residences//Booking//EN', 'BEGIN:VEVENT',
        'UID:' + ref + '@jamariresidences.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;VALUE=DATE:' + c4.stay.ci.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + c4.stay.co.replace(/-/g, ''),
        'SUMMARY:Stay at Jamari Residences · ' + r4.name, 'LOCATION:3a Jide Sawyerr Drive\\, Lekki Phase 1\\, Lagos',
        'DESCRIPTION:Booking ' + ref + '. Check in from 2 pm\\, check out by 12 pm. WhatsApp +234 704 820 0009.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var cal = document.getElementById('add-cal');
      cal.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      cal.download = 'jamari-stay-' + ref + '.ics';
      document.getElementById('msg-team').href = WA + '?text=' + encodeURIComponent('Hello Jamari, this is ' + (g4.name || 'a guest') + '. My booking reference is ' + ref + '.');
    } else if (c4) {
      document.querySelector('.flow-main').innerHTML = missingHTML('We couldn’t find this booking. Start again with your dates.');
    }
  }
})();
