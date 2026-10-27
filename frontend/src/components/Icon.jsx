const PATHS = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  convert: 'M7 7h11l-3.5-3.5M17 17H6l3.5 3.5',
  analytics: 'M4 19h16M7 15l3.5-4 3 2.5L18 8',
  swap: 'M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3',
  star: 'm12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4',
  chevron: 'm6 9 6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  up: 'M12 19V5m0 0-6 6m6-6 6 6',
  down: 'M12 5v14m0 0 6-6m-6 6-6-6',
  flat: 'M5 12h14',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5v-4m0-4h.01',
  refresh: 'M20 11a8 8 0 0 0-14.7-4.3L4 8m0-4v4h4m-4 5a8 8 0 0 0 14.7 4.3L20 16m0 4v-4h-4',
  table: 'M4 5h16v14H4V5Zm0 5h16M4 15h16M10 5v14',
  chart: 'M4 19h16M7 15l3.5-4 3 2.5L18 8',
  plus: 'M12 5v14M5 12h14',
  arrowRight: 'M5 12h14m0 0-5-5m5 5-5 5',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
};

/** Decorative line icon. Give the surrounding control an accessible name; the icon is hidden from assistive tech. */
export default function Icon({ name, size = 20, filled = false, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
