
(() => {
  'use strict';
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.nav');
  menu?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(Boolean(open)));
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menu?.setAttribute('aria-expanded','false');
  }));

  const reveal = [...document.querySelectorAll('.motion-reveal')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), {threshold:.12, rootMargin:'0px 0px -35px'});
    reveal.forEach(el => observer.observe(el));
  } else reveal.forEach(el => el.classList.add('is-visible'));

  const video = document.getElementById('heroVideo');
  const toggle = document.getElementById('heroVideoToggle');
  toggle?.addEventListener('click', async () => {
    if (!video) return;
    if (video.paused) { try { await video.play(); } catch (_) {} }
    else video.pause();
    toggle.textContent = video.paused ? '▶ PLAY' : 'Ⅱ PAUSE';
    toggle.setAttribute('aria-pressed', String(video.paused));
  });
  video?.addEventListener('play', () => { if(toggle) toggle.textContent='Ⅱ PAUSE'; });
  video?.addEventListener('pause', () => { if(toggle) toggle.textContent='▶ PLAY'; });
})();
