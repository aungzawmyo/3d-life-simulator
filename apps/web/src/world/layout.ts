export interface PlaceLayout {
  x: number;
  z: number;
  h: number;
  w: number;
  d: number;
  color: string;
}

export const PLACE_LAYOUT: Record<string, PlaceLayout> = {
  home_a: { x: -7.2, z: -3.4, h: 2.4, w: 2.4, d: 2.2, color: "#b98662" },
  home_b: { x: -7.2, z: 1.6, h: 2.0, w: 2.4, d: 2.2, color: "#c49a74" },
  home_c: { x: -10.6, z: -0.6, h: 1.7, w: 2.2, d: 2.6, color: "#9a6d52" },
  home_d: { x: 8.4, z: -4.8, h: 1.5, w: 1.8, d: 1.8, color: "#d2b48a" },
  home_e: { x: 8.6, z: 2.8, h: 1.9, w: 2.6, d: 2.2, color: "#b07a55" },
  office: { x: 1.4, z: -6.4, h: 3.2, w: 3.6, d: 2.4, color: "#6d86a0" },
  shop: { x: 5.4, z: -0.4, h: 1.6, w: 3.0, d: 2.4, color: "#d4a05a" },
  park: { x: 0.2, z: 5.6, h: 0.18, w: 6.4, d: 5.2, color: "#4f7a4e" },
  school: { x: -2.4, z: -7.4, h: 2.1, w: 3.2, d: 2.2, color: "#c7b37a" },
  hospital: { x: 8.2, z: 7.2, h: 2.3, w: 2.8, d: 2.4, color: "#d8d4cc" },
  cafe: { x: 3.2, z: 3.2, h: 1.3, w: 2.2, d: 2.0, color: "#8b5a4a" },
};

export function placePosition(id: string): [number, number, number] {
  const place = PLACE_LAYOUT[id];
  if (!place) return [0, 0.45, 0];
  return [place.x, place.h + 0.35, place.z];
}
