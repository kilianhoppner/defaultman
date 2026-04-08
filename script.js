// ==========================
//  Live London UTC Time
// ==========================
const londonTimeEl = document.getElementById('londonTime');

function updateLondonTime() {
  if (!londonTimeEl) return;

  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  londonTimeEl.textContent = `London UTC ${hours}:${minutes}:${seconds}`;
}

updateLondonTime();
setInterval(updateLondonTime, 1000);

// Open all links with class "hyperlink" in a new tab.
document.querySelectorAll('a.hyperlink').forEach((link) => {
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
});
