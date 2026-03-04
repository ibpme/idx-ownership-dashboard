export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render: (row: T) => string | HTMLElement;
  sortValue?: (row: T) => number | string;
  className?: string;
}

export function renderTable<T>(
  container: HTMLElement,
  columns: Column<T>[],
  data: T[],
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  let sortKey = '';
  let sortAsc = true;
  let currentData = [...data];

  function buildBody() {
    const oldBody = table.querySelector('tbody');
    if (oldBody) oldBody.remove();
    const tbody = document.createElement('tbody');
    for (const row of currentData) {
      const tr = document.createElement('tr');
      for (const col of columns) {
        const td = document.createElement('td');
        if (col.align === 'right') td.classList.add('right');
        if (col.className) td.classList.add(...col.className.split(' '));
        const content = col.render(row);
        if (typeof content === 'string') {
          td.innerHTML = content;
        } else {
          td.appendChild(content);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  function updateArrows() {
    headerRow.querySelectorAll('.sort-arrow').forEach((el) => {
      const th = el.closest('th')!;
      const key = th.dataset.key;
      if (key === sortKey) {
        el.classList.add('active');
        el.textContent = sortAsc ? '\u25B2' : '\u25BC';
      } else {
        el.classList.remove('active');
        el.textContent = '\u25B2';
      }
    });
  }

  for (const col of columns) {
    const th = document.createElement('th');
    th.dataset.key = col.key;
    if (col.align === 'right') th.classList.add('right');
    th.innerHTML = `${col.label} <span class="sort-arrow">\u25B2</span>`;
    if (col.sortValue) {
      th.addEventListener('click', () => {
        if (sortKey === col.key) {
          sortAsc = !sortAsc;
        } else {
          sortKey = col.key;
          sortAsc = true;
        }
        currentData.sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          const cmp = va < vb ? -1 : va > vb ? 1 : 0;
          return sortAsc ? cmp : -cmp;
        });
        updateArrows();
        buildBody();
      });
    }
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);
  buildBody();
  wrapper.appendChild(table);
  container.appendChild(wrapper);
}
