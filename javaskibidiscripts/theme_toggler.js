const buttons = document.querySelectorAll('.theme-btn');
const slider = document.querySelector('.slider');
const body = document.body;

function setTheme(themeKey) {
  body.classList.remove('light-mode', 'dark-mode', 'high-contrast');

  if (themeKey === 'light' || themeKey === 'default') {
    body.classList.add('light-mode');
  } else if (themeKey === 'dark') {
    body.classList.add('dark-mode');
  } else if (themeKey === 'high-contrast') {
    body.classList.add('high-contrast');
  }

  localStorage.setItem('theme', themeKey);

  updateSlider(themeKey);
}

function updateSlider(themeKey) {
  buttons.forEach(btn => btn.classList.remove('active', 'squeeze'));
  slider.classList.add('sliding');

  let targetBtn;
  if (themeKey === 'light' || themeKey === 'default') targetBtn = document.querySelector('.theme-btn.light-mode');
  else if (themeKey === 'dark') targetBtn = document.querySelector('.theme-btn.dark-mode');
  else if (themeKey === 'high-contrast') targetBtn = document.querySelector('.theme-btn.high-contrast');

  if (!targetBtn) return;

  targetBtn.classList.add('active');
  targetBtn.classList.add('squeeze');

  // Use offsetLeft for relative position inside .theme-switch container
  const offsetX = targetBtn.offsetLeft;

  // Update slider width in case buttons differ in size (optional)
  const btnWidth = targetBtn.offsetWidth;
  slider.style.width = btnWidth + 'px';

  slider.style.transform = `translateX(${offsetX}px) scale(1)`;

  setTimeout(() => {
    slider.classList.remove('sliding');
  }, 450);
}

// Initialize and add event listeners
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('light-mode')) setTheme('light');
      else if (btn.classList.contains('dark-mode')) setTheme('dark');
      else if (btn.classList.contains('high-contrast')) setTheme('high-contrast');
    });
  });
});