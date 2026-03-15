import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionMovies } from '@/lib/api';
import type { Collection } from '@/lib/api';

interface CollectionCardProps {
  collection: Collection;
  /** Fixed width for horizontal scroll usage. Defaults to full width (browse grid). */
  fixedWidth?: string;
}

export default function CollectionCard({ collection, fixedWidth }: CollectionCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05, rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['collection-preview', collection.slug],
    queryFn: () => fetchCollectionMovies(collection.rules, collection.sort, 1, 'en'),
    enabled: visible,
    staleTime: 30 * 60 * 1000,
  });

  const posters = (data?.movies ?? [])
    .filter(m => m.Poster && m.Poster !== 'N/A')
    .slice(0, 3)
    .map(m => m.Poster!);

  return (
    <Link
      ref={ref}
      to={`/app/collection/${collection.slug}`}
      className={`block rounded-xl overflow-hidden glass-card hover:opacity-90 transition-opacity flex-shrink-0${fixedWidth ? ` ${fixedWidth}` : ''}`}
    >
      {/* Poster mosaic */}
      <div className="h-24 flex overflow-hidden">
        {visible && isLoading ? (
          <div className="w-full h-full bg-secondary animate-pulse" />
        ) : posters.length > 0 ? (
          posters.map((poster, i) => (
            <div
              key={i}
              className="flex-1 overflow-hidden"
              style={{ marginLeft: i > 0 ? '1px' : 0 }}
            >
              <img
                src={poster}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))
        ) : (
          <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary/10" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider leading-none">
          {collection.type}
        </span>
        <p className="text-xs font-semibold text-foreground leading-snug mt-1 line-clamp-2">
          {collection.title}
        </p>
      </div>
    </Link>
  );
}
