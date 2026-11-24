(function () {
  try {
    var saved = localStorage.getItem('pa-theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#14100D' : '#FFFFFF');
    if (sessionStorage.getItem('pa-splash')) root.classList.add('no-splash');
  } catch (e) {}
})();
