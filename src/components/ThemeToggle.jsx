import { MonitorIcon, MoonIcon, SunIcon } from './Icons.jsx';

const LABELS = {
  system: 'Theme: follow system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

const ICONS = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export default function ThemeToggle({ mode, onCycle }) {
  const Icon = ICONS[mode] ?? MonitorIcon;
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onCycle}
      title={LABELS[mode]}
      aria-label={`${LABELS[mode]}. Activate to change.`}
    >
      <Icon className="icon-btn__icon" />
    </button>
  );
}
