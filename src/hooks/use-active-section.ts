'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which of the given section ids is currently "active" (closest to
 * viewport center) via one shared IntersectionObserver. Backs scroll-aware
 * wayfinding UI (JourneyRail, PageToc) without each one running its own
 * observer.
 */
export function useActiveSection(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const key = ids.join('|');

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const indexById = new Map(ids.map((id, i) => [id, i]));
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        if (visible.size === 0) return;
        const lowestId = Array.from(visible).sort(
          (a, b) => (indexById.get(a) ?? 0) - (indexById.get(b) ?? 0),
        )[0];
        setActiveId(lowestId);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}
