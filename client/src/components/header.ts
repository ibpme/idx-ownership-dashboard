import { navigate } from '../router';
export function renderHeader(onSearch?: () => void): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';

  header.innerHTML = `
    <div class="header-logo">IDX <span>Ownership</span></div>
    <nav class="header-nav">
      <a href="#/">Home</a>
      <a href="#/local-foreign">Local/Foreign</a>
      <a href="#/conglomerates">Conglomerates</a>
      <a href="#/network">Network</a>
    </nav>
    <button class="header-search-trigger" type="button">
      <span class="label">Search</span>
      <span class="kbd">Ctrl+K</span>
    </button>
  `;

  header.querySelector('.header-logo')!.addEventListener('click', () => navigate('/'));

  if (onSearch) {
    header.querySelector('.header-search-trigger')!.addEventListener('click', () => onSearch());
  }

  // Update active nav link on hash change
  function updateNav() {
    const hash = window.location.hash.slice(1) || '/';
    header.querySelectorAll('.header-nav a').forEach((a) => {
      const href = a.getAttribute('href')!.slice(1);
      a.classList.toggle('active', hash === href || (href !== '/' && hash.startsWith(href)));
    });
  }
  window.addEventListener('hashchange', updateNav);
  updateNav();

  return header;
}
