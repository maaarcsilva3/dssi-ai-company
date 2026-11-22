/** Astro base — always with trailing slash (e.g. `/dev/jpa-marketing-website/`). */
export const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/**
 * Prefix site-root paths for subpath deploy.
 * Page routes get a trailing slash before `?` / `#` so reverse-proxy nginx
 * does not emit a host-absolute 301 that strips `/dev/jpa-marketing-website`.
 */
export function withBase(path = '/'): string {
  if (!path || path === '/') return baseUrl;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:')
  ) {
    return path;
  }
  if (path.startsWith('#')) return `${baseUrl}${path}`;

  const hashIndex = path.indexOf('#');
  const queryIndex = path.indexOf('?');
  const cutAt =
    hashIndex >= 0 && queryIndex >= 0
      ? Math.min(hashIndex, queryIndex)
      : hashIndex >= 0
        ? hashIndex
        : queryIndex >= 0
          ? queryIndex
          : -1;
  const suffix = cutAt >= 0 ? path.slice(cutAt) : '';
  const main = cutAt >= 0 ? path.slice(0, cutAt) : path;

  const stripped = main.replace(/^\//, '').replace(/\/$/, '');
  // Static files keep extension; pages get trailing slash
  const isAsset = /\.[a-zA-Z0-9]+$/.test(stripped);
  const pagePath = isAsset ? stripped : stripped ? `${stripped}/` : '';
  return `${baseUrl}${pagePath}${suffix}`;
}

export const site = {
  name: 'JPA Freight Logistics, Inc.',
  shortName: 'JPA Freight',
  tagline: 'Whatever day it is… we deliver.',
  description:
    'Nationwide freight and hauling across the Philippines—24/7 operations, GPS on every unit, and a Batangas team focused on ethical, customer-first logistics.',
  primaryCta: 'Request a quote',
  primaryCtaHref: withBase('/contact#quote'),
  phone: '0923-803-6723',
  phoneTel: 'tel:+639238036723',
  phoneLandline: '046-557-6885',
  phoneLandlineTel: 'tel:+63465576885',
  emailSales: 'sales@jpafreight.ph',
  emailAdmin: 'admin@jpafreight.ph',
  address: '466 Zone 4, Brgy. Natatas, Tanauan City, Batangas',
  facebook: 'https://facebook.com/jpafreight',
  hoursOffice: 'Mon–Sat, 8:00–17:00',
  hoursOps: '24/7',
  founded: 2004,
  foundedAs: 'JP Trucking Services',
  corpYear: 2015,
  fleetCount: '100+',
  fleetType: '10-wheeler trucks',
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT ?? '',
} as const;

export const navLinks = [
  { href: withBase('/services'), label: 'Services' },
  { href: withBase('/about'), label: 'About' },
  { href: withBase('/contact'), label: 'Contact' },
] as const;
