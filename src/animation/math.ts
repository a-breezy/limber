/** Tiny 3D math kit. Right-handed: +x = figure's left, +y = up, +z = facing direction. */

export type Vec3 = readonly [number, number, number];
/** Row-major 3x3 matrix. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const ZERO: Vec3 = [0, 0, 0];
export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const distance = (a: Vec3, b: Vec3) => length(sub(a, b));
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return l < 1e-12 ? [0, 0, 0] : scale(a, 1 / l);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;

/** +deg tilts +y toward +z (and -y toward -z). */
export function rotX(d: number): Mat3 {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

/** +deg turns +z toward +x. */
export function rotY(d: number): Mat3 {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

/** +deg turns +x toward +y (and -y toward +x). */
export function rotZ(d: number): Mat3 {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export function mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!;
    }
  }
  return r as unknown as Mat3;
}

export const mulAll = (...ms: Mat3[]): Mat3 => ms.reduce(mul, IDENTITY);

export function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Angle between two vectors, degrees. */
export function angleBetween(a: Vec3, b: Vec3) {
  const la = length(a);
  const lb = length(b);
  if (la < 1e-12 || lb < 1e-12) return 0;
  return deg(Math.acos(clamp(dot(a, b) / (la * lb), -1, 1)));
}
