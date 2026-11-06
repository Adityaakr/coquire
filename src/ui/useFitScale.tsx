import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Scales a fixed pixel composition down to fit its container width.
 * The kit's illustrations are authored at exact pixel sizes; this keeps them
 * pixel faithful on desktop and proportionally smaller on narrow screens.
 */
export function useFitScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / designWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);
  return { ref, scale };
}

export function Fit({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  const { ref, scale } = useFitScale(width);
  return (
    <div ref={ref} className="fit" style={{ height: height * scale }}>
      <div className="fit-in" style={{ width, height, transform: `scale(${scale})` }}>{children}</div>
    </div>
  );
}
