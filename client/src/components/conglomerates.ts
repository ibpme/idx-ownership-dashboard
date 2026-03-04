import { api } from '../api';
import { renderTable, type Column } from './table';
import type { ConglomerateTicker } from '../types';

export async function renderConglomerates(container: HTMLElement) {
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const groups = await api.conglomerates();
    container.innerHTML = '';

    const title = document.createElement('h1');
    title.className = 'page-title';
    title.textContent = 'Business Conglomerates';
    container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'page-subtitle';
    subtitle.textContent = `${groups.length} major Indonesian business groups and their listed holdings`;
    container.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.className = 'card-grid';

    for (const g of groups) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">${g.name}</div>
        <div class="card-meta"><strong>${g.ticker_count}</strong> listed companies</div>
      `;
      card.addEventListener('click', () => {
        window.location.hash = `#/conglomerates/${g.id}`;
      });
      grid.appendChild(card);
    }

    container.appendChild(grid);
  } catch {
    container.innerHTML = '<div class="error-message">Failed to load conglomerates</div>';
  }
}

export async function renderConglomerateDetail(container: HTMLElement, id: string) {
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const detail = await api.conglomerateDetail(id);
    container.innerHTML = '';

    const back = document.createElement('a');
    back.className = 'back-link';
    back.href = '#/conglomerates';
    back.textContent = '\u2190 All Conglomerates';
    back.addEventListener('click', (event) => {
      event.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = '#/conglomerates';
      }
    });
    container.appendChild(back);

    const title = document.createElement('h1');
    title.className = 'page-title';
    title.textContent = detail.name;
    container.appendChild(title);

    // Get unique tickers
    const tickerSet = new Set(detail.tickers.map((t) => t.share_code));
    const subtitle = document.createElement('p');
    subtitle.className = 'page-subtitle';
    subtitle.textContent = `${tickerSet.size} listed companies`;
    container.appendChild(subtitle);

    const columns: Column<ConglomerateTicker>[] = [
      {
        key: 'share_code',
        label: 'Ticker',
        className: 'ticker-link',
        render: (r) => `<a href="#/ticker/${r.share_code}">${r.share_code}</a>`,
        sortValue: (r) => r.share_code,
      },
      {
        key: 'issuer_name',
        label: 'Company',
        render: (r) => r.issuer_name,
        sortValue: (r) => r.issuer_name,
      },
      {
        key: 'investor_name',
        label: 'Through Entity',
        className: 'investor-link',
        render: (r) => `<a href="#/investor/${encodeURIComponent(r.investor_name)}">${r.investor_name}</a>`,
        sortValue: (r) => r.investor_name,
      },
      {
        key: 'percentage',
        label: '%',
        align: 'right',
        className: 'mono',
        render: (r) => `${r.percentage.toFixed(2)}%`,
        sortValue: (r) => r.percentage,
      },
    ];

    renderTable(container, columns, detail.tickers);
  } catch {
    container.innerHTML = '<div class="error-message">Conglomerate not found</div>';
  }
}
