import { useEffect, useState } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'graph' }
  | { name: 'findings' }
  | { name: 'finding'; id: string }
  | { name: 'packages' }
  | { name: 'services' }
  | { name: 'tickets' }
  | { name: 'upload' }
  | { name: 'audit' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const parts = h.split('/');
  if (h === '' || h === 'dashboard') return { name: 'dashboard' };
  if (h === 'graph') return { name: 'graph' };
  if (h === 'findings') return { name: 'findings' };
  if (parts[0] === 'finding' && parts[1]) return { name: 'finding', id: parts[1] };
  if (h === 'packages') return { name: 'packages' };
  if (h === 'services') return { name: 'services' };
  if (h === 'tickets') return { name: 'tickets' };
  if (h === 'upload') return { name: 'upload' };
  if (h === 'audit') return { name: 'audit' };
  return { name: 'dashboard' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'dashboard': return '#/dashboard';
    case 'graph': return '#/graph';
    case 'findings': return '#/findings';
    case 'finding': return `#/finding/${route.id}`;
    case 'packages': return '#/packages';
    case 'services': return '#/services';
    case 'tickets': return '#/tickets';
    case 'upload': return '#/upload';
    case 'audit': return '#/audit';
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (r: Route) => {
    window.location.hash = routeToHash(r);
  };

  return { route, navigate };
}
