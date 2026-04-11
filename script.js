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





// Open all links with class "hyperlink" in a new tab.
function setupHyperlinks() {
  document.querySelectorAll('a.hyperlink').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
}

/**
 * Animated favicon: solid rectangle cycling the hue wheel, starting at yellow (#FFFF00 ≈ 60°).
 * rAF + frequent href commits (small ° per step) + slight diagonal HSL gradient to soften banding.
 * (The tab icon may still look stepped if the browser throttles redraws.)
 * Requires <link rel="icon" href="favicon/favicon.png"> (or any initial icon) in the document.
 */
function setupRainbowFavicon() {
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;

  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const startHue = 60; // #FFFF00
  /** Degrees per second (360 / huePerSecond ≈ seconds for one full cycle). */
  const huePerSecond = 10;
  /** Min ms between href commits; ~0.14°/step at 10°/s & 14ms (smaller steps = smoother). */
  const minMsBetweenFaviconCommits = 14;
  /** Diagonal gradient span in hue (°); softens flat fills so shifts read less “stepped”. */
  const hueGradientSpread = 1.2;

  const t0 = performance.now();
  let lastCommit = -Infinity;
  let raf = 0;

  function commitFavicon() {
    link.href = canvas.toDataURL('image/png');
  }

  function wrapHue(h) {
    return ((h % 360) + 360) % 360;
  }

  function drawAtElapsed(elapsedSec) {
    const hue = (startHue + elapsedSec * huePerSecond) % 360;
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, `hsl(${wrapHue(hue - hueGradientSpread / 2)} 92% 52%)`);
    g.addColorStop(1, `hsl(${wrapHue(hue + hueGradientSpread / 2)} 92% 52%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  function frame(now) {
    const elapsed = (now - t0) / 1000;
    drawAtElapsed(elapsed);

    if (now - lastCommit >= minMsBetweenFaviconCommits) {
      commitFavicon();
      lastCommit = now;
    }
    raf = requestAnimationFrame(frame);
  }

  drawAtElapsed(0);
  commitFavicon();
  lastCommit = performance.now();
  raf = requestAnimationFrame(frame);

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
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

/** Music tile: press the icon to play/pause. */
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
    setupRainbowFavicon();
    setupHyperlinks();
    setupGalleryMidnightStamp();
    setupGalleryAudioSlots();
  });
} else {
  setupLondonClock();
  setupRainbowFavicon();
  setupHyperlinks();
  setupGalleryMidnightStamp();
  setupGalleryAudioSlots();
}
