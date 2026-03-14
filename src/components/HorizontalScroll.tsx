import { useRef, useEffect, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

const FADE = '2.5rem';

const masks = {
  none:  'none',
  right: `linear-gradient(to right, black calc(100% - ${FADE}), transparent 100%)`,
  left:  `linear-gradient(to right, transparent 0%, black ${FADE})`,
  both:  `linear-gradient(to right, transparent 0%, black ${FADE}, black calc(100% - ${FADE}), transparent 100%)`,
};

export default function HorizontalScroll({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const applyMask = () => {
    const el = ref.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 4;
    const atEnd   = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
    const mask = atStart && atEnd ? masks.none
               : atStart          ? masks.right
               : atEnd            ? masks.left
               :                    masks.both;
    el.style.maskImage = mask;
    el.style.webkitMaskImage = mask;
  };

  // Drag-to-scroll (desktop)
  const dragging  = useRef(false);
  const startX    = useRef(0);
  const scrollOrigin = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    scrollOrigin.current = ref.current?.scrollLeft ?? 0;
    ref.current?.classList.add('cursor-grabbing', 'select-none');
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !ref.current) return;
      ref.current.scrollLeft = scrollOrigin.current - (e.clientX - startX.current);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      ref.current?.classList.remove('cursor-grabbing', 'select-none');
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    applyMask();
    el.addEventListener('scroll', applyMask, { passive: true });
    const ro = new ResizeObserver(applyMask);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', applyMask);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      className={`flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide cursor-grab ${className}`}
    >
      {children}
    </div>
  );
}
