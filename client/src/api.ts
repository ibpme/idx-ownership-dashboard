import type {
  Stats,
  SearchResult,
  Ticker,
  TickerDetail,
  TickerLF,
  InvestorDetail,
  ConglomerateSummary,
  ConglomerateDetail,
  NetworkGraph,
  CompanyProfile,
} from './types';

const BASE = '/api';

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  stats: () => get<Stats>('/stats'),
  search: (q: string, signal?: AbortSignal) =>
    get<SearchResult>(`/search?q=${encodeURIComponent(q)}`, signal),
  tickers: () => get<Ticker[]>('/tickers'),
  tickerDetail: (code: string) => get<TickerDetail>(`/tickers/${code}`),
  tickerLF: (code: string) => get<TickerLF>(`/tickers/${code}/local-foreign`),
  investorDetail: (name: string) =>
    get<InvestorDetail>(`/investors/${encodeURIComponent(name)}`),
  conglomerates: () => get<ConglomerateSummary[]>('/conglomerates'),
  conglomerateDetail: (id: string) =>
    get<ConglomerateDetail>(`/conglomerates/${id}`),
  companyProfile: (code: string) =>
    get<CompanyProfile>(`/company-profile/${encodeURIComponent(code)}`),
  network: (params: { ticker?: string; investor?: string; depth?: number }) => {
    const sp = new URLSearchParams();
    if (params.ticker) sp.set('ticker', params.ticker);
    if (params.investor) sp.set('investor', params.investor);
    if (params.depth != null) sp.set('depth', String(params.depth));
    return get<NetworkGraph>(`/network?${sp}`);
  },
};
