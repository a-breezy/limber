import { apply, mul, rotX, rotY, type Mat3, type Vec3 } from './math';

export type CameraName = 'side' | 'front' | 'threeQuarter';

/** yaw: + turns the figure so it faces screen-right. pitch: + = camera raised, looking down. */
export const CAMERAS: Record<CameraName, { yaw: number; pitch: number; label: string }> = {
  side: { yaw: 90, pitch: 6, label: 'Side' },
  front: { yaw: 0, pitch: 6, label: 'Front' },
  threeQuarter: { yaw: 50, pitch: 12, label: '3/4' },
};

/** World → camera rotation. `mirrored` flips the view so the working side stays nearest. */
export function cameraMatrix(name: CameraName, mirrored = false): Mat3 {
  const { yaw, pitch } = CAMERAS[name];
  return mul(rotX(pitch), rotY(mirrored ? -yaw : yaw));
}

export interface Projected {
  x: number;
  y: number;
  /** Larger = closer to the viewer. */
  depth: number;
}

/** Orthographic projection into SVG space (y down), metres. */
export function project(cam: Mat3, p: Vec3): Projected {
  const [x, y, z] = apply(cam, p);
  return { x, y: -y, depth: z };
}
