export interface Stats {
  total_rows: number;
  total_tickers: number;
  total_investors: number;
  local_investors: number;
  foreign_investors: number;
}

export interface TickerMatch {
  share_code: string;
  issuer_name: string;
  free_float_pct: number | null;
  total_shares: number | null;
}

export interface InvestorMatch {
  investor_name: string;
  holdings: number;
}

export interface SearchResult {
  tickers: TickerMatch[];
  investors: InvestorMatch[];
}

export interface Ticker {
  share_code: string;
  issuer_name: string;
  free_float_pct: number | null;
  total_shares: number | null;
}

export interface Shareholder {
  investor_name: string;
  investor_type: string;
  local_foreign: string;
  nationality: string;
  total_holding_shares: number;
  percentage: number;
}

export interface TickerDetail {
  share_code: string;
  issuer_name: string;
  free_float_pct: number | null;
  total_shares: number | null;
  shareholders: Shareholder[];
}

export interface Holding {
  share_code: string;
  issuer_name: string;
  investor_type: string;
  local_foreign: string;
  total_holding_shares: number;
  percentage: number;
}

export interface InvestorDetail {
  investor_name: string;
  holdings: Holding[];
}

export interface LFBreakdown {
  investor_type: string;
  local_shares: number;
  foreign_shares: number;
  local_pct: number;
  foreign_pct: number;
}

export interface TickerLF {
  share_code: string;
  issuer_name: string;
  breakdown: LFBreakdown[];
  total_local_pct: number;
  total_foreign_pct: number;
}

export interface ConglomerateSummary {
  id: string;
  name: string;
  ticker_count: number;
}

export interface ConglomerateTicker {
  share_code: string;
  issuer_name: string;
  investor_name: string;
  percentage: number;
}

export interface ConglomerateDetail {
  id: string;
  name: string;
  tickers: ConglomerateTicker[];
}

export interface GraphNode {
  id: string;
  type: 'ticker' | 'investor';
  name: string;
}

export interface GraphLink {
  source: string;
  target: string;
  percentage: number;
}

export interface NetworkGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}
