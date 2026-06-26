/* ============================================================
   ARTECLAB · GeoServer 3 · Slide System — slides.js
   ============================================================ */
(function () {
  'use strict';

  const THEME_KEY = 'arteclab-theme';
  let current = 0;
  let slides   = [];
  let dots     = [];

  /* ── THEME ─────────────────────────────────────────────── */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.querySelector('.t-icon').textContent  = t === 'dark' ? '☀' : '◐';
    btn.querySelector('.t-label').textContent = t === 'dark' ? 'Claro' : 'Oscuro';
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const dark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (dark ? 'dark' : 'light'));
    document.getElementById('themeBtn').addEventListener('click', () => {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  /* ── YEAR ──────────────────────────────────────────────── */
  function setYear() {
    const y = new Date().getFullYear();
    document.querySelectorAll('.auto-year').forEach(el => el.textContent = y);
  }

  /* ── NAVIGATION ────────────────────────────────────────── */
  function goTo(n) {
    if (n < 0 || n >= slides.length) return;
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = n;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
    updateUI();
  }

  function updateUI() {
    const total = slides.length;
    const num   = current + 1;
    const counter = document.getElementById('slideCounter');
    if (counter) counter.innerHTML = `<span>${num}</span> / ${total}`;

    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = Math.round((num / total) * 100) + '%';

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.disabled = current === 0;
    if (btnNext) btnNext.disabled = current === total - 1;
  }

  /* ── FULLSCREEN ────────────────────────────────────────── */
  function toggleFS() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ── KEYBOARD ──────────────────────────────────────────── */
  function handleKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown'  || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'f' || e.key === 'F') toggleFS();
    if (e.key === 'Home') goTo(0);
    if (e.key === 'End')  goTo(slides.length - 1);
  }

  /* ── SWIPE ─────────────────────────────────────────────── */
  function initSwipe() {
    let startX = 0;
    const wrap = document.querySelector('.slides-wrap');
    if (!wrap) return;
    wrap.addEventListener('touchstart', e => startX = e.touches[0].clientX, { passive: true });
    wrap.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
    });
  }

  /* ── INIT ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    slides = Array.from(document.querySelectorAll('.slide'));
    dots   = Array.from(document.querySelectorAll('.nav-dot'));

    if (slides.length === 0) return;

    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
    document.getElementById('btnPrev')?.addEventListener('click', () => goTo(current - 1));
    document.getElementById('btnNext')?.addEventListener('click', () => goTo(current + 1));
    document.getElementById('fsBtn')?.addEventListener('click', toggleFS);

    document.addEventListener('keydown', handleKey);
    initSwipe();
    initTheme();
    setYear();
    goTo(0);
  });

  /* Public API */
  window.slidesGoTo = goTo;
})();
