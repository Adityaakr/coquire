/** The Coquire mark: a double C monogram (two parties pooling) with a blue node, on the brand's gradient tile. Same drawing as the favicon. */
export function CoquireMark({ size = 32, light }: { size?: number; light?: boolean }) {
  const id = light ? 'cq-l' : 'cq-d';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          {light ? <><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#EDF1F4" /></> : <><stop offset="0" stopColor="#2E2E2E" /><stop offset="1" stopColor="#050505" /></>}
        </linearGradient>
        <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="1" y2="1">
          {light ? <><stop offset="0" stopColor="#1D1D1D" /><stop offset="1" stopColor="#323232" /></> : <><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#9EC4FF" /></>}
        </linearGradient>
        <linearGradient id={`${id}-dot`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5290F4" /><stop offset="1" stopColor="#406AE4" /></linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill={`url(#${id}-tile)`} />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="16.25" fill="none" stroke={light ? '#1D1D1D' : '#FFFFFF'} strokeOpacity={light ? 0.08 : 0.14} />
      <path d="M43.6 20.4A16 16 0 1 0 43.6 43.6" fill="none" stroke={`url(#${id}-ink)`} strokeWidth="5" strokeLinecap="round" />
      <path d="M38.2 27.2A8 8 0 1 0 38.2 36.8" fill="none" stroke={`url(#${id}-ink)`} strokeWidth="3.2" strokeLinecap="round" opacity="0.5" />
      <circle cx="45.5" cy="32" r="4.6" fill={`url(#${id}-dot)`} />
      <circle cx="45.5" cy="32" r="4.6" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="0.8" />
    </svg>
  );
}
