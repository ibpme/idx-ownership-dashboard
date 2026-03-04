import { api } from '../api';
import { formatShares, investorTypeLabel, lfLabel } from '../utils';
import { renderTable, type Column } from './table';
import type { Holding } from '../types';

export async function renderInvestorDetail(container: HTMLElement, name: string) {
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const detail = await api.investorDetail(name);

    container.innerHTML = '';

    const back = document.createElement('a');
    back.className = 'back-link';
    back.href = '#/';
    back.textContent = '\u2190 Back';
    back.addEventListener('click', (event) => {
      event.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = '#/';
      }
    });
    container.appendChild(back);

    const title = document.createElement('h1');
    title.className = 'page-title';
    title.textContent = detail.investor_name;
    container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'page-subtitle';
    subtitle.textContent = `Holds >1% stake in ${detail.holdings.length} companies`;
    container.appendChild(subtitle);

    const columns: Column<Holding>[] = [
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
        key: 'investor_type',
        label: 'Type',
        render: (r) => `<span class="tag tag-type">${investorTypeLabel(r.investor_type)}</span>`,
        sortValue: (r) => r.investor_type,
      },
      {
        key: 'local_foreign',
        label: 'L/F',
        render: (r) => `<span class="tag ${r.local_foreign === 'L' ? 'tag-local' : 'tag-foreign'}">${lfLabel(r.local_foreign)}</span>`,
        sortValue: (r) => r.local_foreign,
      },
      {
        key: 'total_holding_shares',
        label: 'Shares',
        align: 'right',
        className: 'mono',
        render: (r) => formatShares(r.total_holding_shares),
        sortValue: (r) => r.total_holding_shares,
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

    renderTable(container, columns, detail.holdings);
  } catch {
    container.innerHTML = '<div class="error-message">Investor not found</div>';
  }
}
