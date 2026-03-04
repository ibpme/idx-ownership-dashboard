import { api } from '../api';
import { formatNumber } from '../utils';

export async function renderStatsBar(container: HTMLElement) {
  container.innerHTML = '<div class="loading">Loading stats</div>';
  try {
    const stats = await api.stats();
    container.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'stats-bar';

    const items = [
      { value: stats.total_tickers, label: 'Tickers' },
      { value: stats.total_investors, label: 'Investors' },
      { value: stats.local_investors, label: 'Local' },
      { value: stats.foreign_investors, label: 'Foreign' },
      { value: stats.total_rows, label: 'Total Records' },
    ];

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `
        <div class="value">${formatNumber(item.value)}</div>
        <div class="label">${item.label}</div>
      `;
      bar.appendChild(card);
    }
    container.appendChild(bar);
  } catch {
    container.innerHTML = '<div class="error-message">Failed to load stats</div>';
  }
}
