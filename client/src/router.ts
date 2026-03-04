type RouteHandler = (params: Record<string, string>) => void;

interface Route {
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

const routes: Route[] = [];

export function route(path: string, handler: RouteHandler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    '^' +
      path.replace(/:([^/]+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      }) +
      '$',
  );
  routes.push({ pattern, keys, handler });
}

export function navigate(hash: string) {
  window.location.hash = hash;
}

function resolve() {
  const fullHash = window.location.hash.slice(1) || '/';
  const hash = fullHash.split('?')[0] || '/';
  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (m) {
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      r.handler(params);
      return;
    }
  }
  // fallback to home
  routes[0]?.handler({});
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
