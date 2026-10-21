/* Jamari Residences: shared site script.
   Mobile menu · sticky booking bar · residence previews · demo forms ·
   date + guest pickers · the four booking steps (demo: no payment is taken). */
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
    return { ci: p.get('checkin') || '', co: p.get('checkout') || '', g: parseInt(p.get('guests'), 10) || 0, room: p.get('room') || '' };
  }
  function stayQuery(o) {
    var p = new URLSearchParams();
    if (o.ci) p.set('checkin', o.ci);
    if (o.co) p.set('checkout', o.co);
    if (o.g) p.set('guests', o.g);
    if (o.room) p.set('room', o.room);
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

  // ---------------------------------------------------------------- booking line: brand date + guest pickers
  function initBooking(form) {
    var q = function (s) { return form.querySelector(s); };
    var btn = q('.cta'), hint = q('.hint');
    var slotIn = q('.slot-in'), slotOut = q('.slot-out'), slotG = q('.slot-guests');
    var cal = q('.cal'), months = q('.cal-months'), step = q('.cal-step'), sum = q('.cal-sum');
    var prev = q('.cal-prev'), next = q('.cal-next'), gPop = q('.guest-pop'), gList = q('.guest-list');
    var start = readStay();
    var S = { ci: start.ci >= TODAY ? start.ci : '', co: '', g: start.g || 0 }, mode = 'in', opener = null;
    if (S.ci && start.co > S.ci) S.co = start.co;
    var maxGuests = parseInt(form.dataset.max, 10) || 6;
    if (S.g > maxGuests) S.g = 0;
    var now = new Date(), FIRST = new Date(now.getFullYear(), now.getMonth(), 1), view = FIRST;
    var nights = function () { return nightsOf(S); };

    function renderCal() {
      var count = window.innerWidth < 700 ? 1 : 2, html = '';
      for (var k = 0; k < count; k++) {
        var m = new Date(view.getFullYear(), view.getMonth() + k, 1);
        html += '<div class="month"><p class="mname">' + MONTH[m.getMonth()] + ' ' + m.getFullYear() + '</p><div class="wk" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="days">';
        var lead = (m.getDay() + 6) % 7, last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        for (var i = 0; i < lead; i++) html += '<span></span>';
        for (var d = 1; d <= last; d++) {
          var v = iso(new Date(m.getFullYear(), m.getMonth(), d)), cls = 'day';
          if (v === TODAY) cls += ' today';
          if (v === S.ci) cls += ' start';
          if (v === S.co) cls += ' end';
          if (S.ci && S.co && v > S.ci && v < S.co) cls += ' in';
          html += '<button type="button" class="' + cls + '" data-v="' + v + '" aria-label="' + fmtYear(v) + '"' + (v < TODAY ? ' disabled' : '') + ' aria-pressed="' + (v === S.ci || v === S.co) + '">' + d + '</button>';
        }
        html += '</div></div>';
      }
      months.innerHTML = html;
      prev.disabled = view <= FIRST;
      step.textContent = mode === 'in' ? 'Choose your check-in date' : 'Now choose your check-out date';
      sum.innerHTML = S.ci ? '<b>' + fmt(S.ci) + '</b> – ' + (S.co ? '<b>' + fmt(S.co) + '</b> · ' + plural(nights(), 'night') : '…') : 'No dates yet';
    }
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
    }
    function pick(v) {
      if (mode === 'in' || !S.ci || v <= S.ci) { S.ci = v; S.co = ''; mode = 'out'; renderCal(); focusDay(v); }
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
        hint.innerHTML = '<b>' + fmt(S.ci) + ' – ' + fmt(S.co) + '</b> · ' + plural(nights(), 'night') + ' · ' + plural(S.g, 'guest');
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
      var stay = { ci: S.ci, co: S.co, g: S.g, room: form.dataset.room || readStay().room };
      if (form.dataset.go) { location.href = form.dataset.go + '?' + stayQuery(stay); return; }
      history.replaceState(null, '', '?' + stayQuery(stay));
      document.dispatchEvent(new CustomEvent('jamari:stay', { detail: stay }));
    });
    sync();
  }
  document.querySelectorAll('form.booking').forEach(initBooking);

  // ---------------------------------------------------------------- booking flow pages
  var page = document.body.dataset.page;

  function summaryHTML(stay, r) {
    var n = nightsOf(stay), total = r.price ? naira(r.price * n) : '[Price to confirm]';
    return '<img src="assets/img/' + r.photo + '.jpg" alt="">' +
      '<div><span class="label">' + esc(r.type) + '</span><h2>' + esc(r.name) + '</h2></div>' +
      '<ul class="rows plain">' +
      '<li><span>Dates</span><span>' + fmt(stay.ci) + ' – ' + fmtYear(stay.co) + '</span></li>' +
      '<li><span>Nights</span><span>' + n + '</span></li>' +
      '<li><span>Guests</span><span>' + plural(stay.g, 'guest') + '</span></li>' +
      '<li><span>Rate</span><span>' + (r.price ? naira(r.price) + ' × ' + plural(n, 'night') : '[₦—] per night') + '</span></li>' +
      '</ul><div class="total"><span>Total</span><span>' + total + '</span></div>' +
      '<p class="note">Paid securely through Paystack.</p>';
  }
  function missingHTML(text) {
    return '<div class="flow-missing"><p>' + text + '</p><a class="btn inline" href="book.html">Choose your dates</a></div>';
  }
  function flowGuard() {
    var stay = readStay(), r = findRes(stay.room);
    if (!datesOk(stay) || !r) {
      var main = document.querySelector('.flow-main'), side = document.querySelector('.summary');
      if (main) main.innerHTML = missingHTML('Your booking details are missing or out of date. Start again with your dates and guests.');
      if (side) side.hidden = true;
      return null;
    }
    document.querySelectorAll('.stepper a').forEach(function (a) { a.href = a.getAttribute('href').split('?')[0] + '?' + stayQuery(stay); });
    var side2 = document.querySelector('.summary');
    if (side2) side2.innerHTML = summaryHTML(stay, r);
    return { stay: stay, r: r };
  }

  // step 1: dates and residence
  if (page === 'book') {
    var list = document.getElementById('pick-list'), head = document.getElementById('pick-head');
    var renderPicks = function (stay) {
      var ok = datesOk(stay), n = ok ? nightsOf(stay) : 0;
      head.innerHTML = ok
        ? 'Residences for <b>' + fmt(stay.ci) + ' – ' + fmt(stay.co) + '</b> · ' + plural(n, 'night') + ' · ' + plural(stay.g, 'guest') + '. [Preview: every residence shows as free.]'
        : 'Choose your dates and guests above to see the price for your stay.';
      list.innerHTML = RES.map(function (r) {
        var fits = !stay.g || stay.g <= r.guests, sel = r.slug === stay.room;
        var price = r.price ? (ok ? '<b>' + naira(r.price * n) + '</b><small>' + naira(r.price) + ' × ' + plural(n, 'night') + '</small>' : '<b>' + naira(r.price) + '</b><small>per night</small>') : '<b>[Price to confirm]</b>';
        var act = !fits ? '<small>Sleeps up to ' + r.guests + '</small>'
          : ok ? '<a class="btn" href="book-details.html?' + stayQuery({ ci: stay.ci, co: stay.co, g: stay.g, room: r.slug }) + '">' + (sel ? 'Continue' : 'Select') + '</a>'
          : '<small>Pick dates first</small>';
        return '<article class="pick' + (sel ? ' sel' : '') + (fits ? '' : ' off') + '">' +
          '<img src="assets/img/' + r.photo + '.jpg" alt="" loading="lazy">' +
          '<div><span class="label">' + esc(r.type) + (sel ? ' · your choice' : '') + '</span><h3>' + esc(r.name) + '</h3><span class="spec">' + esc(r.spec) + '</span></div>' +
          '<div class="side">' + price + act + '</div></article>';
      }).join('');
    };
    renderPicks(readStay());
    document.addEventListener('jamari:stay', function (e) { renderPicks(e.detail); });
  }

  // step 2: guest details
  if (page === 'book-details') {
    var ctx = flowGuard(), f2 = document.getElementById('details-form');
    if (ctx && f2) {
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

  // step 3: review and pay
  if (page === 'book-pay') {
    var c3 = flowGuard(), g3 = store('jamari-guest');
    if (c3 && !g3) document.querySelector('.flow-main').innerHTML = missingHTML('We need your details before payment. Go back one step.');
    else if (c3) {
      var n3 = nightsOf(c3.stay), q3 = stayQuery(c3.stay);
      document.getElementById('review').innerHTML =
        '<li><span>Residence</span><span>' + esc(c3.r.name) + ' · <a href="book.html?' + q3 + '">Change</a></span></li>' +
        '<li><span>Dates</span><span>' + fmt(c3.stay.ci) + ' – ' + fmtYear(c3.stay.co) + ' · ' + plural(n3, 'night') + ' · <a href="book.html?' + q3 + '">Change</a></span></li>' +
        '<li><span>Guests</span><span>' + plural(c3.stay.g, 'guest') + '</span></li>' +
        '<li><span>Lead guest</span><span>' + esc(g3.name) + ' · ' + esc(g3.phone) + ' · <a href="book-details.html?' + q3 + '">Edit</a></span></li>';
      var payBtn = document.getElementById('pay-btn'), f3 = document.getElementById('pay-form');
      payBtn.textContent = c3.r.price ? 'Pay ' + naira(c3.r.price * n3) + ' securely' : 'Send booking request';
      f3.querySelector('.back').href = 'book-details.html?' + q3;
      f3.addEventListener('submit', function (e) {
        e.preventDefault();
        var terms = document.getElementById('terms');
        terms.closest('.check').classList.toggle('err', !terms.checked);
        if (!terms.checked) { terms.focus(); return; }
        var ref = 'JR-' + c3.stay.ci.slice(2, 4) + c3.stay.ci.slice(5, 7) + c3.stay.ci.slice(8, 10) + '-' + String(Math.floor(Math.random() * 900) + 100);
        location.href = 'book-confirmed.html?' + q3 + '&ref=' + ref;
      });
    }
  }

  // step 4: confirmed
  if (page === 'book-confirmed') {
    var c4 = flowGuard(), g4 = store('jamari-guest') || {};
    if (c4) {
      var ref = new URLSearchParams(location.search).get('ref') || 'JR-preview';
      document.getElementById('who').textContent = (g4.name || 'friend').split(' ')[0] + '.';
      document.getElementById('ref').textContent = 'Booking ' + ref + ' · ' + c4.r.name + ' · ' + fmt(c4.stay.ci) + ' – ' + fmtYear(c4.stay.co);
      document.getElementById('sent').textContent = 'Your booking reference is ' + ref + '. [Preview: nothing was booked or sent.]';
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jamari Residences//Booking//EN', 'BEGIN:VEVENT',
        'UID:' + ref + '@jamariresidences.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;VALUE=DATE:' + c4.stay.ci.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + c4.stay.co.replace(/-/g, ''),
        'SUMMARY:Stay at Jamari Residences · ' + c4.r.name, 'LOCATION:3a Jide Sawyerr Drive\\, Lekki Phase 1\\, Lagos',
        'DESCRIPTION:Booking ' + ref + '. Check in from 3 pm. WhatsApp +234 704 820 0009.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var cal = document.getElementById('add-cal');
      cal.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      cal.download = 'jamari-stay-' + ref + '.ics';
      document.getElementById('msg-team').href = WA + '?text=' + encodeURIComponent('Hello Jamari, this is ' + (g4.name || 'a guest') + '. My booking reference is ' + ref + '.');
    }
  }
})();
