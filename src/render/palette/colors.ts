// Colour maths and deterministic noise. Pure functions, no canvas.

/** Deterministic 0..1 noise from integer coordinates and a salt. */
export function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function hexToRgb(c: string): [number, number, number] {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(c: string, a: number): string {
  const [r, g, b] = hexToRgb(c);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const k = clamp01(t);
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
}

export function shade(c: string, amount: number): string {
  return amount < 0 ? mix(c, '#000000', -amount) : mix(c, '#ffffff', amount);
}
