export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatShares(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') e.className = v;
      else if (k === 'textContent') e.textContent = v;
      else e.setAttribute(k, v);
    }
  }
  for (const c of children) {
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

export function investorTypeLabel(code: string): string {
  const labels: Record<string, string> = {
    CP: 'Corporate',
    ID: 'Individual',
    IB: 'Bank',
    SC: 'Securities',
    PF: 'Pension Fund',
    OT: 'Other',
    IS: 'Insurance',
  };
  return labels[code] || code;
}

export function lfLabel(code: string): string {
  return code === 'L' ? 'Local' : code === 'A' ? 'Foreign' : code;
}
