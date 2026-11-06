import type { ButtonHTMLAttributes } from 'react';

const SIZE = { sm: 28, md: 36, lg: 44 } as const;

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost' | 'outline';
  size?: keyof typeof SIZE;
  label: string;
};

export function IconButton({ variant = 'ghost', size = 'md', label, children, style, className, ...rest }: IconButtonProps) {
  const s = SIZE[size];
  return (
    <button
      type="button"
      className={['t-ibtn', variant === 'outline' ? 't-ibtn-outline' : '', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      style={{ width: s, height: s, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
