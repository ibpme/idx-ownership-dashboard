import { api } from '../api';
import { formatShares } from '../utils';
import { renderTable, type Column } from './table';
import type { Ticker } from '../types';

interface TickerLFRow {
  share_code: string;
  issuer_name: string;
  local_pct: number;
  foreign_pct: number;
  free_float_pct: number | null;
  total_shares: number | null;
}

export async function renderLocalForeign(container: HTMLElement) {
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const tickers = await api.tickers();
    const floatMap = new Map(
      tickers.map((t: Ticker) => [t.share_code, { free_float_pct: t.free_float_pct, total_shares: t.total_shares }]),
    );

    // Fetch L/F data for all tickers in batches
    const rows: TickerLFRow[] = [];
    const batchSize = 50;
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((t: Ticker) => api.tickerLF(t.share_code).catch(() => null)),
      );
      for (const lf of results) {
        if (lf) {
          const fd = floatMap.get(lf.share_code);
          rows.push({
            share_code: lf.share_code,
            issuer_name: lf.issuer_name,
            local_pct: lf.total_local_pct,
            foreign_pct: lf.total_foreign_pct,
            free_float_pct: fd?.free_float_pct ?? null,
            total_shares: fd?.total_shares ?? null,
          });
        }
      }
    }

    container.innerHTML = '';

    const title = document.createElement('h1');
    title.className = 'page-title';
    title.textContent = 'Local vs Foreign Ownership';
    container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'page-subtitle';
    subtitle.textContent = `Ownership breakdown for ${rows.length} tickers (shareholders >1%)`;
    container.appendChild(subtitle);

    // Filter buttons
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';
    const filters = [
      { label: 'All', fn: () => true },
      { label: 'Mostly Local (>80%)', fn: (r: TickerLFRow) => r.local_pct > 80 },
      { label: 'Mostly Foreign (>50%)', fn: (r: TickerLFRow) => r.foreign_pct > 50 },
      { label: 'Mixed', fn: (r: TickerLFRow) => r.local_pct <= 80 && r.foreign_pct <= 50 },
    ];

    let currentFilter = filters[0].fn;

    const tableContainer = document.createElement('div');

    function redraw() {
      tableContainer.innerHTML = '';
      const filtered = rows.filter(currentFilter);
      const columns: Column<TickerLFRow>[] = [
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
          key: 'total_shares',
          label: 'Total Shares',
          align: 'right',
          className: 'mono',
          render: (r) => (r.total_shares != null ? formatShares(r.total_shares) : '—'),
          sortValue: (r) => r.total_shares ?? -1,
        },
        {
          key: 'free_float_pct',
          label: 'Free Float',
          align: 'right',
          className: 'mono',
          render: (r) =>
            r.free_float_pct != null
              ? `<span style="color:var(--accent)">${r.free_float_pct.toFixed(1)}%</span>`
              : '—',
          sortValue: (r) => r.free_float_pct ?? -1,
        },
        {
          key: 'local_pct',
          label: 'Local %',
          align: 'right',
          className: 'mono',
          render: (r) => `<span style="color:var(--green)">${r.local_pct.toFixed(1)}%</span>`,
          sortValue: (r) => r.local_pct,
        },
        {
          key: 'foreign_pct',
          label: 'Foreign %',
          align: 'right',
          className: 'mono',
          render: (r) => `<span style="color:var(--blue)">${r.foreign_pct.toFixed(1)}%</span>`,
          sortValue: (r) => r.foreign_pct,
        },
        {
          key: 'bar',
          label: 'Distribution',
          render: (r) => {
            const unknownPct = Math.max(0, 100 - r.local_pct - r.foreign_pct);
            return `<div style="display:flex;height:16px;border-radius:3px;overflow:hidden;min-width:120px;background:var(--border)">
              <div style="width:${r.local_pct.toFixed(1)}%;background:var(--green)"></div>
              <div style="width:${r.foreign_pct.toFixed(1)}%;background:var(--blue)"></div>
              <div style="width:${unknownPct.toFixed(1)}%;background:var(--border)"></div>
            </div>`;
          },
        },
      ];
      renderTable(tableContainer, columns, filtered);
    }

    for (const f of filters) {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (f === filters[0] ? ' active' : '');
      btn.textContent = f.label;
      btn.addEventListener('click', () => {
        filterRow.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = f.fn;
        redraw();
      });
      filterRow.appendChild(btn);
    }

    container.appendChild(filterRow);
    container.appendChild(tableContainer);
    redraw();
  } catch {
    container.innerHTML = '<div class="error-message">Failed to load data</div>';
  }
}
