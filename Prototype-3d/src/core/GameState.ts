export type ArtStyle = 'voxel' | 'lowpoly';
export type CameraMode = 'angled' | 'top';
export type GraveCondition = 'clean' | 'neglected' | 'decorated';
export type EnvironmentTime = 'day' | 'dusk' | 'night';

export interface GraveRecord {
  id: string;
  type: number;
  name: string;
  x: number;
  z: number;
  seed: number;
  condition: GraveCondition;
}

export interface GameState {
  readonly seed: number;
  style: ArtStyle;
  camera: CameraMode;
  time: EnvironmentTime;
  selectedGraveId: string | null;
  readonly graves: GraveRecord[];
}

const graveNames = ['Ada Bellombra', 'Ettore Senzasonno', 'Livia dei Rovi', 'Otto Maltempo', 'Marta Vespera', 'Nilo Sottovoce', 'Ginevra Quiete', 'Piero Mezzanotte', 'Dora Campanella', 'Arturo Nembi', 'Viola Foscari', 'Cesare del Ponte'];

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGameState(seed = 717): GameState {
  const random = seededRandom(seed);
  const graves: GraveRecord[] = [];
  const slots: [number, number][] = [
    [-9, -6], [-6, -6], [-3, -6], [3, -6], [6, -6], [9, -6],
    [-9, -3], [-6, -3], [-3, -3], [3, -3], [6, -3], [9, -3],
    [-9, 3], [-6, 3], [-3, 3], [3, 3], [6, 3], [9, 3],
    [-9, 6], [-6, 6], [-3, 6], [3, 6], [6, 6], [9, 6],
  ];
  slots.forEach(([x, z], index) => graves.push({
    id: `grave-${index + 1}`, type: index % 5, name: graveNames[index % graveNames.length],
    x: x + (random() - .5) * .3, z: z + (random() - .5) * .3,
    seed: Math.floor(random() * 1_000_000), condition: index % 7 === 0 ? 'neglected' : index % 5 === 0 ? 'decorated' : 'clean',
  }));
  return { seed, style: 'lowpoly', camera: 'angled', time: 'dusk', selectedGraveId: null, graves };
}
