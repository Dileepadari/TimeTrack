/**
 * Inline SVG icons.
 *
 * Every icon shares `base`, which marks it `aria-hidden` and unfocusable: each
 * one sits inside a control that already carries the accessible name, so an
 * icon that announced itself would say the same thing twice.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

/* Each icon is a bare path on the shared `base` props; none carries a label. */

export const PlayIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M7 4.5 19 12 7 19.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const FlagIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5 21V4" />
    <path d="M5 4.5h11.5l-2 3.75 2 3.75H5" />
  </svg>
);

export const ResetIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2" />
    <path d="M3.5 4.5V10H9" />
  </svg>
);

export const CopyIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" />
  </svg>
);

export const CheckIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const SunIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
  </svg>
);

export const MoonIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />
  </svg>
);

export const MonitorIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
    <path d="M8.5 20.5h7M12 16.5v4" />
  </svg>
);
