import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const HEIGHT: Record<Size, number> = { sm: 32, md: 40, lg: 48, xl: 56 };
const FONT: Record<Size, number> = { sm: 13, md: 14, lg: 15, xl: 16 };
const PAD: Record<Size, number> = { sm: 14, md: 18, lg: 22, xl: 26 };

type Common = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
};
type AsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'className'> & { href?: undefined; to?: undefined };
type AsAnchor = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'style' | 'className'> & { href: string; to?: undefined };
type AsLink = Common & { to: string; href?: undefined; target?: string };
export type ButtonProps = AsButton | AsAnchor | AsLink;

function sizing(size: Size, block: boolean | undefined, style: CSSProperties | undefined): CSSProperties {
  return { height: HEIGHT[size], fontSize: FONT[size], padding: `0 ${PAD[size]}px`, width: block ? '100%' : undefined, ...style };
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', block, loading, disabled, icon, children, style, className } = props;
  const cls = ['t-btn', `t-btn-${variant}`, className].filter(Boolean).join(' ');
  const off = disabled || loading ? 'true' : undefined;
  const inner = (
    <>
      {loading ? <span className="t-spin" aria-hidden /> : icon ?? null}
      {children}
    </>
  );
  if ('to' in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={cls} data-disabled={off} style={sizing(size, block, style)} aria-disabled={off === 'true' || undefined}>
        {inner}
      </Link>
    );
  }
  if ('href' in props && props.href !== undefined) {
    const { variant: _v, size: _s, block: _b, loading: _l, disabled: _d, icon: _i, children: _c, style: _st, className: _cn, ...rest } = props;
    return (
      <a className={cls} data-disabled={off} style={sizing(size, block, style)} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {inner}
      </a>
    );
  }
  const { variant: _v, size: _s, block: _b, loading: _l, disabled: _d, icon: _i, children: _c, style: _st, className: _cn, ...rest } = props as AsButton;
  return (
    <button type="button" className={cls} data-disabled={off} disabled={disabled || loading} style={sizing(size, block, style)} {...rest}>
      {inner}
    </button>
  );
}
