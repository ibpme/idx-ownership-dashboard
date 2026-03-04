import './style.css';
import { route, startRouter, navigate } from './router';
import { renderHeader } from './components/header';
import { renderStatsBar } from './components/stats-bar';
import { createSearch } from './components/search';
import { renderTickerDetail } from './components/ticker-detail';
import { renderInvestorDetail } from './components/investor-detail';
import { renderLocalForeign } from './components/local-foreign';
import { renderConglomerates, renderConglomerateDetail } from './components/conglomerates';
import { renderNetworkGraph } from './components/network-graph';

const app = document.getElementById('app')!;

// Global search modal
const searchModal = document.createElement('div');
searchModal.className = 'search-modal';
searchModal.setAttribute('aria-hidden', 'true');
searchModal.innerHTML = `
  <div class="search-modal-backdrop"></div>
  <div class="search-modal-panel" role="dialog" aria-modal="true">
    <div class="search-modal-header">
      <span>Search</span>
      <span class="search-modal-hint">Esc to close</span>
    </div>
    <div class="search-modal-body"></div>
  </div>
`;
document.body.appendChild(searchModal);

const searchModalBody = searchModal.querySelector('.search-modal-body') as HTMLElement;
const { input: modalInput } = createSearch(searchModalBody, false, (type, value) => {
  if (type === 'ticker') {
    navigate(`/ticker/${value}`);
  } else {
    navigate(`/investor/${encodeURIComponent(value)}`);
  }
  closeSearchModal();
});

function openSearchModal() {
  searchModal.classList.add('open');
  searchModal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => modalInput.focus(), 50);
}

function closeSearchModal() {
  searchModal.classList.remove('open');
  searchModal.setAttribute('aria-hidden', 'true');
  modalInput.value = '';
}

searchModal.querySelector('.search-modal-backdrop')!.addEventListener('click', closeSearchModal);
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearchModal();
  }
  if (event.key === 'Escape' && searchModal.classList.contains('open')) {
    closeSearchModal();
  }
});

// Add header
const header = renderHeader(openSearchModal);
app.appendChild(header);

// Content area
const content = document.createElement('main');
content.className = 'container';
app.appendChild(content);

function setContent(render: (el: HTMLElement) => void) {
  content.innerHTML = '';
  render(content);
}

route('/', () => {
  setContent((el) => {
    const hero = document.createElement('div');
    hero.className = 'home-hero';
    hero.innerHTML = `<h1>IDX Ownership Intelligence</h1><p>Explore shareholders holding &gt;1% in all IDX-listed companies</p>`;
    el.appendChild(hero);

    const searchContainer = document.createElement('div');
    createSearch(searchContainer);
    el.appendChild(searchContainer);

    const statsContainer = document.createElement('div');
    el.appendChild(statsContainer);
    renderStatsBar(statsContainer);
  });
});

route('/ticker/:code', (params) => {
  setContent((el) => renderTickerDetail(el, params.code));
});

route('/investor/:name', (params) => {
  setContent((el) => renderInvestorDetail(el, params.name));
});

route('/local-foreign', () => {
  setContent((el) => renderLocalForeign(el));
});

route('/conglomerates', () => {
  setContent((el) => renderConglomerates(el));
});

route('/conglomerates/:id', (params) => {
  setContent((el) => renderConglomerateDetail(el, params.id));
});

route('/network', () => {
  setContent((el) => renderNetworkGraph(el));
});

startRouter();
