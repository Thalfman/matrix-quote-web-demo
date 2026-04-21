(function(){
  const KEY = 'matrix-theme';
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  function mount(){
    if (document.querySelector('.theme-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label','Toggle theme');
    btn.innerHTML = '<span class="dot"></span><span class="label"></span>';
    const label = btn.querySelector('.label');
    const paint = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      label.textContent = dark ? 'DARK' : 'LIGHT';
    };
    paint();
    btn.addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem(KEY,'light'); }
      else      { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem(KEY,'dark'); }
      paint();
    });
    document.body.appendChild(btn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
