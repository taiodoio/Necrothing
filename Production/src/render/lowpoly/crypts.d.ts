import type * as THREE from 'three';

export interface CryptInfo { id: string; name: string; short: string; subtitle: string; accent: string; description: string; signature: string }
export type CryptState = 'clean' | 'dirty' | 'broken';
export const CRYPTS: CryptInfo[];
export const STATES: Array<{ id: CryptState; name: string }>;
export const VARIANTS: Record<string, string[]>;
/** Un lotto 4 × 5 celle (cripta e cortile), origine al centro a terra, fronte verso +Z. `variant`: 1-3. */
export function createCrypt(type?: string, state?: CryptState, opts?: { merge?: boolean; buildingOnly?: boolean; variant?: number }): THREE.Group;
