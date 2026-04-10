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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupLondonClock();
    setupHyperlinks();
  });
} else {
  setupLondonClock();
  setupHyperlinks();
}
