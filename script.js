// ==========================
//  Live Local-Time Clock
// ==========================
function setupLondonClock() {
  const clockEl = document.getElementById('londonClock');
  if (!clockEl) return;

  const hourHand = clockEl.querySelector('.hour-hand');
  const minuteHand = clockEl.querySelector('.minute-hand');
  const secondHand = clockEl.querySelector('.second-hand');
  if (!hourHand || !minuteHand || !secondHand) return;

  function updateLondonClock() {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const hourDeg = (hours + minutes / 60) * 30;
    const minuteDeg = (minutes + seconds / 60) * 6;
    const secondDeg = seconds * 6;

    hourHand.style.transform = `translate(0, -50%) rotate(${hourDeg - 90}deg)`;
    minuteHand.style.transform = `translate(0, -50%) rotate(${minuteDeg - 90}deg)`;
    secondHand.style.transform = `translate(0, -50%) rotate(${secondDeg - 90}deg)`;
  }

  updateLondonClock();
  setInterval(updateLondonClock, 1000);
}

/**
 * Desktop (≥769px): click the clock to show it enlarged in the viewport centre; click again or Escape to close.
 * Hover uses the same transform transition as nav buttons; expand/collapse snap instantly (transition cleared in JS).
 * Scale ~78% of shorter side. No dim overlay.
 */
function setupClockDesktopExpand() {
  const clockEl = document.getElementById('londonClock');
  if (!clockEl) return;

  const mq = window.matchMedia('(min-width: 769px)');

  function computeScale() {
    const v = Math.min(window.innerWidth, window.innerHeight);
    const targetDiameter = v * 0.78;
    const baseVisual = 75 * 1.2;
    return Math.min(12, Math.max(3, targetDiameter / baseVisual));
  }

  /** Avoid animating transform when toggling expanded state (hover nudge still uses CSS transition). */
  function withNoTransition(run) {
    clockEl.style.setProperty('transition', 'none');
    run();
    void clockEl.offsetWidth;
    clockEl.style.removeProperty('transition');
  }

  function collapse() {
    withNoTransition(() => {
      clockEl.classList.remove('clock--expanded');
      clockEl.style.removeProperty('--clock-scale');
      clockEl.setAttribute('aria-expanded', 'false');
    });
  }

  function expand() {
    withNoTransition(() => {
      clockEl.style.setProperty('--clock-scale', String(computeScale()));
      clockEl.classList.add('clock--expanded');
      clockEl.setAttribute('aria-expanded', 'true');
    });
  }

  function toggle(e) {
    if (!mq.matches) return;
    if (e) e.stopPropagation();
    if (clockEl.classList.contains('clock--expanded')) {
      collapse();
    } else {
      expand();
    }
  }

  clockEl.setAttribute('role', 'button');
  clockEl.tabIndex = 0;
  clockEl.setAttribute('aria-expanded', 'false');

  clockEl.addEventListener('click', toggle);

  clockEl.addEventListener('keydown', (e) => {
    if (!mq.matches) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle(e);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mq.matches && clockEl.classList.contains('clock--expanded')) {
      collapse();
    }
  });

  window.addEventListener('resize', () => {
    if (mq.matches && clockEl.classList.contains('clock--expanded')) {
      clockEl.style.setProperty('--clock-scale', String(computeScale()));
    }
    if (!mq.matches && clockEl.classList.contains('clock--expanded')) {
      collapse();
    }
  });

  mq.addEventListener('change', () => {
    if (!mq.matches) collapse();
  });
}

// Open all links with class "hyperlink" in a new tab.
function setupHyperlinks() {
  document.querySelectorAll('a.hyperlink').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
}

/** Gallery tile: clock stuck in 23:59:00–23:59:59, looping forever (never midnight). */
function setupGalleryMidnightStamp() {
  const timeEl = document.querySelector('.gallery-midnight-time');
  if (!timeEl) return;

  let seconds = 0;
  function tick() {
    const ss = String(seconds).padStart(2, '0');
    timeEl.textContent = `23:59:${ss}`;
    timeEl.setAttribute('datetime', `1970-01-01T23:59:${ss}`);
    seconds = (seconds + 1) % 60;
  }
  tick();
  window.setInterval(tick, 1000);
}

/** Music tile: press the icon to play/pause (gallery detail page). */
function setupGalleryAudioSlots() {
  document.querySelectorAll('.gallery-audio-slot').forEach((slot) => {
    const audio = slot.querySelector('audio');
    const visual = slot.querySelector('.gallery-audio-visual');
    if (!audio || !visual) return;

    const playGlyph = slot.querySelector('.gallery-audio-overlay-play');
    const pauseGlyph = slot.querySelector('.gallery-audio-overlay-pause');

    function syncLabel() {
      const playing = !audio.paused && !audio.ended;
      slot.classList.toggle('is-playing', playing);
      visual.setAttribute('aria-label', playing ? 'Pause audio' : 'Play audio');
      visual.setAttribute('aria-pressed', playing ? 'true' : 'false');
      if (playGlyph && pauseGlyph) {
        if (playing) {
          playGlyph.setAttribute('hidden', '');
          pauseGlyph.removeAttribute('hidden');
        } else {
          pauseGlyph.setAttribute('hidden', '');
          playGlyph.removeAttribute('hidden');
        }
      }
    }
    ['play', 'pause', 'ended', 'playing'].forEach((ev) => {
      audio.addEventListener(ev, syncLabel);
    });
    syncLabel();

    function toggle() {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    }

    visual.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    visual.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggle();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupLondonClock();
    setupClockDesktopExpand();
    setupHyperlinks();
    setupGalleryMidnightStamp();
    setupGalleryAudioSlots();
  });
} else {
  setupLondonClock();
  setupClockDesktopExpand();
  setupHyperlinks();
  setupGalleryMidnightStamp();
  setupGalleryAudioSlots();
}
