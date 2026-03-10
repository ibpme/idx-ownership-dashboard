import { api } from '../api';
import { formatShares, formatNumber, investorTypeLabel, lfLabel } from '../utils';
import { renderTable, type Column } from './table';
import type { Shareholder, CompanyProfile, BoardMember } from '../types';

export async function renderTickerDetail(container: HTMLElement, code: string) {
  container.innerHTML = '<div class="loading">Loading</div>';
  try {
    const [detail, lf, profile] = await Promise.all([
      api.tickerDetail(code),
      api.tickerLF(code),
      api.companyProfile(code).catch(() => null),
    ]);

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
    title.innerHTML = `<span style="font-family:var(--font-mono);color:var(--accent)">${detail.share_code}</span> ${detail.issuer_name}`;
    container.appendChild(title);

    // L/F bar
    const total = lf.total_local_pct + lf.total_foreign_pct;
    if (total > 0) {
      const unknownPct = Math.max(0, 100 - lf.total_local_pct - lf.total_foreign_pct);
      const barDiv = document.createElement('div');
      barDiv.className = 'lf-bar-container';
      barDiv.innerHTML = `
        <div class="lf-bar">
          <div class="local" style="width:${lf.total_local_pct.toFixed(1)}%">${lf.total_local_pct > 5 ? lf.total_local_pct.toFixed(1) + '%' : ''}</div>
          <div class="foreign" style="width:${lf.total_foreign_pct.toFixed(1)}%">${lf.total_foreign_pct > 5 ? lf.total_foreign_pct.toFixed(1) + '%' : ''}</div>
          ${unknownPct > 0 ? `<div class="unknown" style="width:${unknownPct.toFixed(1)}%"></div>` : ''}
        </div>
        <div class="lf-legend">
          <div class="lf-legend-item"><div class="lf-legend-dot" style="background:var(--green)"></div>Local ${lf.total_local_pct.toFixed(1)}%</div>
          <div class="lf-legend-item"><div class="lf-legend-dot" style="background:var(--blue)"></div>Foreign ${lf.total_foreign_pct.toFixed(1)}%</div>
          ${unknownPct > 0 ? `<div class="lf-legend-item"><div class="lf-legend-dot" style="background:var(--border)"></div>Unknown ${unknownPct.toFixed(1)}%</div>` : ''}
        </div>
      `;
      container.appendChild(barDiv);
    }

    // Free float stats
    const statsRow = document.createElement('div');
    statsRow.className = 'ticker-stats-row';
    const statsItems: { label: string; value: string }[] = [
      { label: 'Shareholders >1%', value: `${detail.shareholders.length}` },
    ];
    if (detail.total_shares != null) {
      statsItems.push({ label: 'Total Shares', value: formatNumber(detail.total_shares) });
    }
    if (detail.free_float_pct != null) {
      statsItems.push({ label: 'Free Float', value: `${detail.free_float_pct.toFixed(1)}%` });
    }
    statsRow.innerHTML = statsItems
      .map(
        (s) =>
          `<div class="ticker-stat"><span class="ticker-stat-value">${s.value}</span><span class="ticker-stat-label">${s.label}</span></div>`,
      )
      .join('');
    container.appendChild(statsRow);

    const columns: Column<Shareholder>[] = [
      {
        key: 'investor_name',
        label: 'Investor',
        className: 'investor-link',
        render: (r) => `<a href="#/investor/${encodeURIComponent(r.investor_name)}">${r.investor_name}</a>`,
        sortValue: (r) => r.investor_name,
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

    if (profile) {
      container.appendChild(renderCompanyProfile(profile));
    }

    renderTable(container, columns, detail.shareholders);
  } catch {
    container.innerHTML = '<div class="error-message">Failed to load ticker details</div>';
  }
}

function renderCompanyProfile(p: CompanyProfile): HTMLElement {
  const section = document.createElement('details');
  section.className = 'company-profile';
  section.open = false;

  const summary = document.createElement('summary');
  summary.className = 'company-profile-title';
  summary.textContent = 'Company Profile';
  section.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'company-profile-body';

  // Info grid
  const infoFields: { label: string; value: string }[] = [];
  if (p.sector) infoFields.push({ label: 'Sector', value: p.sector });
  if (p.sub_sector) infoFields.push({ label: 'Sub-Sector', value: p.sub_sector });
  if (p.industry) infoFields.push({ label: 'Industry', value: p.industry });
  if (p.listing_date) infoFields.push({ label: 'Listed', value: p.listing_date });
  if (p.listing_board) infoFields.push({ label: 'Board', value: p.listing_board });
  if (p.phone) infoFields.push({ label: 'Phone', value: p.phone });
  if (p.email) infoFields.push({ label: 'Email', value: p.email });

  if (infoFields.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'company-profile-grid';
    grid.innerHTML = infoFields
      .map(
        (f) =>
          `<div class="company-profile-field"><label>${f.label}</label><span>${f.value}</span></div>`,
      )
      .join('');
    body.appendChild(grid);
  }

  if (p.address) {
    const addr = document.createElement('div');
    addr.className = 'company-profile-address';
    addr.innerHTML = `<label>Address</label><span>${p.address}</span>`;
    body.appendChild(addr);
  }

  if (p.website) {
    const web = document.createElement('div');
    web.className = 'company-profile-address';
    const href = p.website.startsWith('http') ? p.website : `https://${p.website}`;
    web.innerHTML = `<label>Website</label><span><a href="${href}" target="_blank" rel="noopener">${p.website}</a></span>`;
    body.appendChild(web);
  }

  // Board members
  const groups: { title: string; members: BoardMember[] }[] = [
    { title: 'Board of Directors', members: p.directors },
    { title: 'Board of Commissioners', members: p.commissioners },
    { title: 'Audit Committee', members: p.audit_committee },
  ];
  const nonEmpty = groups.filter((g) => g.members.length > 0);
  if (nonEmpty.length > 0) {
    const boardEl = document.createElement('div');
    boardEl.className = 'company-profile-board';
    nonEmpty.forEach((g) => {
      const col = document.createElement('div');
      col.className = 'company-profile-board-section';
      col.innerHTML =
        `<h4>${g.title}</h4>` +
        g.members
          .map(
            (m) =>
              `<div class="board-member"><div class="board-member-name">${m.name}</div><div class="board-member-title">${m.title}</div></div>`,
          )
          .join('');
      boardEl.appendChild(col);
    });
    body.appendChild(boardEl);
  }

  section.appendChild(body);
  return section;
}
