(function () {
  const slot = document.getElementById('faceTrackSlot');
  const video = slot && slot.querySelector('.face-track-video');
  const outline = slot && slot.querySelector('.face-track-outline');
  if (!video || !outline) return;

  /** Camera stream is live (user granted access and video is playing). */
  let streamActive = false;
  /** Face detection loop is running (native or BlazeFace). */
  let trackingActive = false;

  /** Latest raw target from detector (clamped to slot). null = no face. */
  let targetBox = null;
  /** Smoothed box actually drawn. */
  let displayBox = null;

  /** Lower = calmer motion (position only; size stays fixed). */
  const SMOOTH = 0.055;

  /** Matches gallery mobile breakpoint in style.css — larger box on narrow viewports. */
  const MOBILE_MAX_WIDTH = 768;

  function onGalleryDetail() {
    return Boolean(slot.closest('main.gallery-detail'));
  }

  function faceBoxFraction() {
    if (window.innerWidth <= MOBILE_MAX_WIDTH) {
      return onGalleryDetail() ? 0.75 : 0.44;
    }
    return onGalleryDetail() ? 0.65 : 0.34;
  }

  /** Border scales with box edge length on gallery detail; index uses stylesheet 4px. */
  function applyOutlineBorder(size) {
    if (onGalleryDetail()) {
      const px = Math.max(5, Math.min(16, Math.round(size * 0.045)));
      outline.style.borderWidth = `${px}px`;
    } else {
      outline.style.borderWidth = '';
    }
  }

  function placeFallbackBox(W, H) {
    const size = Math.min(W, H) * faceBoxFraction();
    const x = (W - size) / 2;
    const y = (H - size) / 2;
    outline.style.opacity = '1';
    outline.style.left = `${x}px`;
    outline.style.top = `${y}px`;
    outline.style.width = `${size}px`;
    outline.style.height = `${size}px`;
    applyOutlineBorder(size);
  }

  function clampBox(b, W, H) {
    if (!W || !H) return null;
    let w = Math.min(b.w, W);
    let h = Math.min(b.h, H);
    let x = Math.max(0, Math.min(b.x, W - w));
    let y = Math.max(0, Math.min(b.y, H - h));
    return { x, y, w, h };
  }

  /** Fixed square, centered on face; only position updates from detection. */
  function mapFaceToFixedBox(vw, vh, bx, by, bw, bh) {
    const W = slot.clientWidth;
    const H = slot.clientHeight;
    if (!vw || !vh || !W || !H) return null;
    const scale = Math.max(W / vw, H / vh);
    const ox = (W - vw * scale) / 2;
    const oy = (H - vh * scale) / 2;
    const fcx = bx + bw / 2;
    const fcy = by + bh / 2;
    const cx = W - (ox + fcx * scale);
    const cy = oy + fcy * scale;
    const s = Math.min(W, H) * faceBoxFraction();
    return clampBox({ x: cx - s / 2, y: cy - s / 2, w: s, h: s }, W, H);
  }

  function renderLoop() {
    requestAnimationFrame(renderLoop);
    const W = slot.clientWidth;
    const H = slot.clientHeight;
    if (!W || !H) return;

    /* No camera yet, denied, or detector still loading / unavailable: static centered square. */
    if (!streamActive || !trackingActive) {
      displayBox = null;
      placeFallbackBox(W, H);
      return;
    }

    if (!targetBox) {
      displayBox = null;
      outline.style.opacity = '0';
      return;
    }

    const t = targetBox;
    const size = Math.min(W, H) * faceBoxFraction();
    if (!displayBox) {
      displayBox = { x: t.x, y: t.y, w: size, h: size };
    } else {
      displayBox.x += (t.x - displayBox.x) * SMOOTH;
      displayBox.y += (t.y - displayBox.y) * SMOOTH;
      displayBox.w = size;
      displayBox.h = size;
    }

    const c = clampBox(displayBox, W, H);
    displayBox = { x: c.x, y: c.y, w: size, h: size };
    outline.style.opacity = '1';
    outline.style.left = `${c.x}px`;
    outline.style.top = `${c.y}px`;
    outline.style.width = `${size}px`;
    outline.style.height = `${size}px`;
    applyOutlineBorder(size);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  let busy;

  function run(detect) {
    function frame() {
      requestAnimationFrame(frame);
      if (!video.videoWidth || busy) return;
      busy = true;
      detect()
        .then((box) => {
          targetBox = box;
        })
        .catch(() => {})
        .finally(() => {
          busy = false;
        });
    }
    requestAnimationFrame(frame);
  }

  async function init() {
    requestAnimationFrame(renderLoop);

    try {
      video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch {
      return;
    }

    await video.play();
    streamActive = true;

    const vw = () => video.videoWidth;
    const vh = () => video.videoHeight;

    if (typeof FaceDetector !== 'undefined') {
      try {
        const det = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        trackingActive = true;
        run(async () => {
          const faces = await det.detect(video);
          if (!faces.length) return null;
          const b = faces[0].boundingBox;
          return mapFaceToFixedBox(vw(), vh(), b.x, b.y, b.width, b.height);
        });
        return;
      } catch (_) {
        /* fall through to BlazeFace */
      }
    }

    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js');
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js'
      );
      if (typeof blazeface === 'undefined' || !blazeface.load) throw new Error();
      const model = await blazeface.load();
      trackingActive = true;
      run(async () => {
        const preds = await model.estimateFaces(video, false);
        if (!preds.length) return null;
        const [sx, sy] = preds[0].topLeft;
        const [ex, ey] = preds[0].bottomRight;
        return mapFaceToFixedBox(vw(), vh(), sx, sy, ex - sx, ey - sy);
      });
    } catch {
      /* Camera works but no detector — keep fallback square. */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
