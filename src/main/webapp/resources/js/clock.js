function startClock(elementId, interval = 6000) {
  const clockEl = document.getElementById(elementId);
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleString('ru-RU', { hour12: false });
  }

  updateClock(); // сразу текущее время
  setInterval(updateClock, interval);
}

document.addEventListener("DOMContentLoaded", () => {
  startClock('clock');
});