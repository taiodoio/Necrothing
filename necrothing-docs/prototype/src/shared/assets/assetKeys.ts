// Mappa gli identificatori interni del codice agli ID asset del manifest
// (= nomi file PNG attesi in `generated/`). Tiene l'Excel/manifest come unica
// fonte dei nomi file.

import type { DecorationType, GraveType, StructureType } from '@/shared/domain/enums';

export function graveAssetId(type: GraveType): string {
  return `grave_${type}`;
}

export function decorationAssetId(type: DecorationType): string {
  return `deco_${type}`;
}

export const STRUCTURE_ASSET_ID: Record<StructureType, string> = {
  path_dirt: 'tile_path_dirt',
  path_stone: 'tile_path_stone',
  fence_wood: 'env_fence_wood',
  fence_iron: 'env_fence_iron',
  wall_stone: 'env_wall_stone',
  lamp_post: 'env_lamp_post',
  mausoleum: 'env_mausoleum',
};

export function structureAssetId(type: StructureType): string {
  return STRUCTURE_ASSET_ID[type];
}

export const WISP_ASSET_ID = 'currency_wisp';
export const TILE_GRASS_ASSET_ID = 'tile_grass';
