import { useEffect, useState } from 'react';
import { orientationFor, type Orientation } from '../core/layout';

/** Tracks the window's shape and reports whether it is portrait or landscape. */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() =>
    orientationFor(window.innerWidth, window.innerHeight),
  );

  useEffect(() => {
    const update = () => setOrientation(orientationFor(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return orientation;
}
