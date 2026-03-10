import { api } from '../api';
import { debounce } from '../utils';
import { navigate } from '../router';

type OnSelectFn = (type: 'ticker' | 'investor', value: string) => void;

export function createSearch(
  container: HTMLElement,
  compact = false,
  onSelect?: OnSelectFn,
): { input: HTMLInputElement } {
  const wrapper = document.createElement('div');
  wrapper.className = compact ? '' : 'home-search';
  wrapper.innerHTML = `
    <span class="search-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
    <input type="text" placeholder="Search tickers or investors..." autocomplete="off" />
  `;
  container.appendChild(wrapper);

  const input = wrapper.querySelector('input')!;
  let dropdown: HTMLElement | null = null;
  let abortCtrl: AbortController | null = null;
  let firstSelection: { type: 'ticker' | 'investor'; value: string } | null = null;

  function removeDropdown() {
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
    }
  }

  function selectItem(type: 'ticker' | 'investor', value: string) {
    removeDropdown();
    if (onSelect) {
      input.value = value;
      onSelect(type, value);
      return;
    }
    input.value = '';
    if (type === 'ticker') {
      navigate(`/ticker/${value}`);
    } else {
      navigate(`/investor/${encodeURIComponent(value)}`);
    }
  }

  const doSearch = debounce(async (q: string) => {
    if (q.length < 1) {
      removeDropdown();
      return;
    }
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();
    try {
      const result = await api.search(q, abortCtrl.signal);
      removeDropdown();
      firstSelection = null;
      if (result.tickers.length === 0 && result.investors.length === 0) return;

      if (result.tickers.length > 0) {
        firstSelection = { type: 'ticker', value: result.tickers[0].share_code };
      } else if (result.investors.length > 0) {
        firstSelection = { type: 'investor', value: result.investors[0].investor_name };
      }

      dropdown = document.createElement('div');
      dropdown.className = 'search-dropdown';

      if (result.tickers.length > 0) {
        const section = document.createElement('div');
        section.className = 'search-dropdown-section';
        section.innerHTML = '<div class="search-dropdown-label">Tickers</div>';
        for (const t of result.tickers) {
          const item = document.createElement('div');
          item.className = 'search-dropdown-item';
          const ffBadge =
            t.free_float_pct != null
              ? `<span class="badge">FF ${t.free_float_pct.toFixed(1)}%</span>`
              : '';
          item.innerHTML = `<span class="code">${t.share_code}</span><span class="name">${t.issuer_name}</span>${ffBadge}`;
          item.addEventListener('click', () => {
            selectItem('ticker', t.share_code);
          });
          section.appendChild(item);
        }
        dropdown.appendChild(section);
      }

      if (result.investors.length > 0) {
        const section = document.createElement('div');
        section.className = 'search-dropdown-section';
        section.innerHTML = '<div class="search-dropdown-label">Investors</div>';
        for (const inv of result.investors) {
          const item = document.createElement('div');
          item.className = 'search-dropdown-item';
          item.innerHTML = `<span class="name">${inv.investor_name}</span><span class="badge">${inv.holdings} holdings</span>`;
          item.addEventListener('click', () => {
            selectItem('investor', inv.investor_name);
          });
          section.appendChild(item);
        }
        dropdown.appendChild(section);
      }

      wrapper.appendChild(dropdown);
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }, 200);

  input.addEventListener('input', () => doSearch(input.value.trim()));
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (!firstSelection) return;
    event.preventDefault();
    selectItem(firstSelection.type, firstSelection.value);
  });
  input.addEventListener('blur', () => setTimeout(removeDropdown, 200));
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 1) doSearch(input.value.trim());
  });

  return { input };
}
