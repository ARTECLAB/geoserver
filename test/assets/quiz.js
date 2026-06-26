/* ============================================================
   ARTECLAB · GeoServer 3 · Quiz System
   Shared logic — quiz.js
   ============================================================ */

(function () {
  'use strict';

  /* ── STATE ─────────────────────────────────────────────── */
  const state = { attempts: {}, answers: {}, completed: {} };

  /* ── DARK MODE ─────────────────────────────────────────── */
  const THEME_KEY = 'arteclab-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const icon  = btn.querySelector('.toggle-icon');
    const label = btn.querySelector('.toggle-label');
    if (theme === 'dark') {
      icon.textContent  = '☀';
      label.textContent = 'Claro';
    } else {
      icon.textContent  = '◐';
      label.textContent = 'Oscuro';
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    document.getElementById('themeToggle')
      .addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });

    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', e => {
        if (!localStorage.getItem(THEME_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
  }

  /* ── PROGRESS ──────────────────────────────────────────── */
  function updateProgress() {
    const total = window.QUIZ_QUESTIONS.length;
    const done  = Object.values(state.completed).filter(Boolean).length;
    const pct   = Math.round((done / total) * 100);

    const bar = document.getElementById('progressFill');
    if (bar) bar.style.width = pct + '%';

    const btn = document.getElementById('btnSubmit');
    if (btn) btn.disabled = done < total;
  }

  /* ── SELECT OPTION ─────────────────────────────────────── */
  window.selectOption = function (qId, optIdx) {
    const q = window.QUIZ_QUESTIONS.find(x => x.id === qId);
    if (!q || state.completed[qId]) return;

    state.attempts[qId] = (state.attempts[qId] || 0) + 1;
    const attempt    = state.attempts[qId];
    const isCorrect  = optIdx === q.correct;

    const card    = document.getElementById('card-' + qId);
    const feedback= document.getElementById('fb-' + qId);
    const opts    = Array.from(card.querySelectorAll('.option-btn'));

    opts.forEach(b => (b.disabled = true));

    if (isCorrect) {
      opts[optIdx].classList.add('selected-correct');
      card.classList.add('answered-correct');
      card.querySelector('.q-number').textContent = '✓';

      const badge = attempt === 1
        ? '<span class="intento-badge i1">1.er intento</span>'
        : '<span class="intento-badge i2">2.º intento</span>';

      feedback.className = 'feedback-area correct-fb';
      feedback.innerHTML =
        `<div class="feedback-title">Correcto${badge}</div>${q.explanation}`;

      state.completed[qId] = true;
      state.answers[qId]   = { correct: true, attempt };

    } else {
      opts[optIdx].classList.add('selected-wrong');

      if (attempt < 2) {
        feedback.className = 'feedback-area hint-fb';
        feedback.innerHTML =
          `<div class="feedback-title">Incorrecto — tienes un segundo intento</div>` +
          `<strong>Pista:</strong> ${q.hint}`;

        setTimeout(() => {
          opts[optIdx].classList.remove('selected-wrong');
          opts.forEach(b => (b.disabled = false));
        }, 1500);

      } else {
        card.classList.add('answered-wrong');
        opts[q.correct].classList.add('reveal-correct');

        feedback.className = 'feedback-area wrong-fb';
        feedback.innerHTML =
          `<div class="feedback-title">Intentos agotados</div>` +
          `<strong>La correcta era la opción ${String.fromCharCode(65 + q.correct)}.</strong> ` +
          q.explanation;

        state.completed[qId] = true;
        state.answers[qId]   = { correct: false, attempt: 2 };
      }
    }

    updateProgress();
  };

  /* ── BUILD QUIZ ────────────────────────────────────────── */
  function buildQuiz() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = '';

    window.QUIZ_QUESTIONS.forEach((q, i) => {
      const letters   = ['A', 'B', 'C', 'D'];
      const optionsHTML = q.options.map((opt, idx) =>
        `<button class="option-btn"
           onclick="selectOption(${q.id}, ${idx})"
           id="opt-${q.id}-${idx}">
          <span class="option-letter">${letters[idx]}</span>
          <span>${opt}</span>
        </button>`
      ).join('');

      const card = document.createElement('div');
      card.className = 'question-card';
      card.id = 'card-' + q.id;
      card.innerHTML =
        `<div class="q-header">
          <div class="q-number">${i + 1}</div>
          <div class="q-content">
            <div class="q-type-tag">${q.type} &middot; ${q.points} pts</div>
            <div class="q-text">${q.text}</div>
          </div>
        </div>
        <div class="options-list">${optionsHTML}</div>
        <div class="feedback-area" id="fb-${q.id}"></div>`;

      container.appendChild(card);

      state.attempts[q.id]  = 0;
      state.answers[q.id]   = null;
      state.completed[q.id] = false;
    });

    updateProgress();
  }

  /* ── SUBMIT ────────────────────────────────────────────── */
  window.submitQuiz = function () {
    let totalScore  = 0;
    let firstCorrect = 0, secondCorrect = 0, wrong = 0;
    const breakdown = [];

    window.QUIZ_QUESTIONS.forEach(q => {
      const ans = state.answers[q.id];
      let pts = 0, icon = 'bi-no', label = 'Sin responder correctamente — 0 pts';

      if (ans && ans.correct) {
        if (ans.attempt === 1) {
          pts = q.points; firstCorrect++;
          icon = 'bi-ok';
          label = `Correcto a la primera — +${pts} pts`;
        } else {
          pts = Math.round(q.points / 2); secondCorrect++;
          icon = 'bi-second';
          label = `Correcto en 2.º intento — +${pts} pts`;
        }
      } else { wrong++; }

      totalScore += pts;
      breakdown.push({ q, pts, icon, label });
    });

    /* Score circle */
    document.getElementById('resFinalScore').textContent = totalScore;
    document.getElementById('resCorrect').textContent    = firstCorrect;
    document.getElementById('resSecond').textContent     = secondCorrect;
    document.getElementById('resWrong').textContent      = wrong;

    /* Grade text */
    let grade, desc;
    if (totalScore >= 90) {
      grade = '🏅 Excelente — Dominas este módulo';
      desc  = 'Estás listo para continuar con la siguiente clase.';
    } else if (totalScore >= 75) {
      grade = '✅ Bien — Tienes una base sólida';
      desc  = 'Repasa los temas en rojo antes de continuar.';
    } else if (totalScore >= 55) {
      grade = '📖 Regular — Refuerza los conceptos clave';
      desc  = 'Revisa la presentación de esta clase y vuelve a intentarlo.';
    } else {
      grade = '🔄 Sigue practicando';
      desc  = 'Revisa el material de la clase y vuelve cuando estés listo.';
    }

    document.getElementById('resGrade').textContent = grade;
    document.getElementById('resDesc').textContent  = desc;

    /* Breakdown */
    document.getElementById('breakdownList').innerHTML = breakdown.map(b =>
      `<div class="breakdown-row">
        <div class="breakdown-icon ${b.icon}">
          ${b.icon === 'bi-ok' ? '✓' : b.icon === 'bi-second' ? '½' : '✗'}
        </div>
        <div class="breakdown-q" title="${b.q.text}">
          P${b.q.id}: ${b.q.text.substring(0, 58)}${b.q.text.length > 58 ? '…' : ''}
        </div>
        <div class="breakdown-pts" style="color:${b.pts > 0 ? 'var(--correct)' : 'var(--wrong)'}">
          +${b.pts}
        </div>
      </div>`
    ).join('');

    const panel = document.getElementById('resultPanel');
    panel.style.display = 'block';
    document.getElementById('btnSubmit').style.display = 'none';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── RETRY ─────────────────────────────────────────────── */
  window.retryQuiz = function () {
    document.getElementById('resultPanel').style.display = 'none';
    document.getElementById('btnSubmit').style.display  = 'block';
    buildQuiz();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── YEAR ──────────────────────────────────────────────── */
  function setYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll('.footer-year').forEach(el => {
      el.textContent = year;
    });
  }

  /* ── INIT ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setYear();
    buildQuiz();
  });

})();
