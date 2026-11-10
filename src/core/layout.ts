export type Orientation = 'portrait' | 'landscape';

/** Portrait when the window is taller than it is wide; landscape otherwise (including squares). */
export function orientationFor(width: number, height: number): Orientation {
  return height > width ? 'portrait' : 'landscape';
}
