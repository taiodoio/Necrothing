// "Cottura" di molte istanze statiche (alberi del bosco, ciuffi, sassi) in una
// geometria unica per chunk e materiale: poche draw call e frustum culling per
// zona, invece di migliaia di mesh o di un InstancedMesh grande come il mondo.

import * as THREE from 'three';
import type { Bucket } from '../render/shape.ts';
import type { CachedModel, MaterialSet } from '../render/modelCache.ts';
import { CHUNK } from './terrain.ts';

interface Item { geo: THREE.BufferGeometry; matrix: THREE.Matrix4; tint: number }

export class ChunkBaker {
  private groups = new Map<string, { bucket: Bucket; mats: MaterialSet; items: Item[] }>();

  add(model: CachedModel, matrix: THREE.Matrix4, tint: number, cellX: number, cellY: number) {
    const chunk = `${Math.floor(cellX / CHUNK)},${Math.floor(cellY / CHUNK)}`;
    for (const [bucket, geo] of Object.entries(model.geometries) as [Bucket, THREE.BufferGeometry][]) {
      if (!geo) continue;
      const key = `${chunk}|${bucket}|${model.mats.solid.uuid}`;
      let g = this.groups.get(key);
      if (!g) this.groups.set(key, (g = { bucket, mats: model.mats, items: [] }));
      g.items.push({ geo, matrix, tint });
    }
  }

  build(castShadow: boolean): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    const v = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    for (const { bucket, mats, items } of this.groups.values()) {
      let verts = 0, inds = 0;
      for (const it of items) { verts += it.geo.getAttribute('position').count; inds += it.geo.index ? it.geo.index.count : it.geo.getAttribute('position').count; }
      const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), col = new Float32Array(verts * 3);
      const ind = verts > 65535 ? new Uint32Array(inds) : new Uint16Array(inds);
      let vo = 0, io = 0;
      for (const it of items) {
        const p = it.geo.getAttribute('position'), n = it.geo.getAttribute('normal'), c = it.geo.getAttribute('color');
        nm.getNormalMatrix(it.matrix);
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(it.matrix);
          pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
          v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
          nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
          col[(vo + i) * 3] = c.getX(i) * it.tint; col[(vo + i) * 3 + 1] = c.getY(i) * it.tint; col[(vo + i) * 3 + 2] = c.getZ(i) * it.tint;
        }
        if (it.geo.index) { const src = it.geo.index; for (let i = 0; i < src.count; i++) ind[io++] = src.getX(i) + vo; }
        else for (let i = 0; i < p.count; i++) ind[io++] = i + vo;
        vo += p.count;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(new THREE.BufferAttribute(ind, 1));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, mats[bucket]);
      mesh.userData.baked = true;
      mesh.castShadow = castShadow && bucket === 'solid';
      mesh.receiveShadow = bucket === 'solid';
      if (bucket === 'ghost') mesh.renderOrder = 2;
      out.push(mesh);
    }
    this.groups.clear();
    return out;
  }
}
