// Testata animata della Casa del Custode: la casa vista di fronte, di notte,
// sul prato (vedi heroScene), com'è adesso: tetto e aggiunte in
// vista. Le finestre accese tremolano, il camino fuma se c'è il fumo, le
// lucciole girano nel cortile e ogni tanto un corvo attraversa il cielo.

import * as THREE from 'three';
import { decodeHouseVariant } from '../game/house.ts';
import { createRng } from '../game/rng.ts';
import { createAnimated, type Animated } from '../render/lowpoly/animated.ts';
import { getModel, instantiate, lightWorldPos } from '../render/modelCache.ts';
import { placeableKey, placeableModel, type PVis } from '../render/models/registry.ts';
import { animateRig, buildRig } from '../view/characters.ts';
import { boxOf, nightHero, type HeroHandle } from './heroScene.ts';

export interface HouseHeader extends HeroHandle {
  /** Cambia tetto e aggiunte in vista (variante di game/house.ts). */
  setVariant(variant: number): void;
}

export function houseHeader(variant: number): HouseHeader {
  let setVariant: (v: number) => void = () => undefined;
  const handle = nightHero('house-hero', [0, -0.4, 3.2], (hero) => {
    const { scene } = hero;
    const holder = new THREE.Group();
    scene.add(holder);
    let house: THREE.Group | null = null, anim: Animated | null = null;
    let lights: Array<{ l: THREE.PointLight; base: number; flicker: number; ph: number }> = [];
    let halos: THREE.Sprite[] = [];
    let box = new THREE.Box3();

    const build = (v: number) => {
      if (house) holder.remove(house);
      if (anim) holder.remove(anim.root);
      for (const { l } of lights) l.removeFromParent();
      for (const s of halos) s.removeFromParent();
      const vis: PVis = { type: 'keeper_house', variant: v, dirty: false, broken: false, lit: true, seed: 1 };
      const model = getModel(placeableKey(vis), 'lowpoly', () => placeableModel(vis), 1);
      house = instantiate(model, { castShadow: false });
      holder.add(house);
      // finestre e lanterna: la luce e un alone caldo
      lights = hero.modelLights(model, holder, 1.4).map((l, i) => ({ l, base: l.intensity, flicker: model.lights[i].flicker, ph: i * 1.9 }));
      halos = model.lights.filter((a) => a.halo > 0).map((a) => {
        const s = hero.halo('#ffc070', 0.55);
        lightWorldPos(a, s.position);
        s.scale.setScalar(0.5 + a.halo * 0.5);
        holder.add(s);
        return s;
      });
      anim = decodeHouseVariant(v).parts.has('smoke') ? createAnimated(vis) : null;
      if (anim) holder.add(anim.root);
      box = boxOf(house);
      // il fumo non conta per l'inquadratura, ma il camino sì: un po' di cielo sopra il tetto
      box.max.y += 0.25;
    };
    build(variant);
    // attorno e dietro, qualche pezzo di cimitero (non quello vero: solo per l'ambientazione)
    hero.backdrop(-5);
    hero.prop('cypress', -4.4, -3.6);
    hero.prop('lamp_post_gothic', -2.7, -2, 0.3);
    hero.grave('stone_simple', -4.6, -2.2, 0.3);
    hero.grave('celtic_cross', 3.9, -2.6, -0.3);
    hero.grave('rectangular', 5.4, -1.2, -0.4);
    hero.grave('gothic', -6.2, -0.8, 0.2);
    setVariant = (v) => { build(v); hero.reframe(); };

    // lucciole nel cortile
    const rf = createRng(13).next;
    const flies = Array.from({ length: 8 }, () => {
      const s = hero.halo('#ffd36b', 0.9);
      s.scale.setScalar(0.16);
      scene.add(s);
      return { s, x: (rf() - 0.5) * 4, y: 0.2 + rf() * 1.2, z: 0.2 + rf() * 1.6, ph: rf() * 6, sp: 0.3 + rf() * 0.4 };
    });
    // un corvo che ogni tanto attraversa il cielo, dietro la casa
    const crow = buildRig('crow', 'lowpoly');
    crow.root.scale.setScalar(0.7);
    scene.add(crow.root);
    const CROW_EVERY = 16, CROW_LEN = 6;

    hero.start(() => ({ box, fill: 0.94, sx: 0.63, base: 0.05, elev: 7 }), (t) => {
      anim?.update(t);
      for (const L of lights) L.l.intensity = L.base * (1 - L.flicker * 0.5 + Math.sin(t * 9 + L.ph) * L.flicker * 0.25 + Math.sin(t * 23 + L.ph * 2) * L.flicker * 0.2);
      for (const [i, s] of halos.entries()) (s.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(t * 7 + i * 2) * 0.06;
      for (const f of flies) {
        f.s.position.set(f.x + Math.sin(t * f.sp + f.ph) * 0.6, f.y + Math.sin(t * f.sp * 1.3 + f.ph * 2) * 0.25, f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 0.4);
        (f.s.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.sin(t * 1.4 + f.ph * 3)) * 0.85;
      }
      const c = (t % CROW_EVERY) / CROW_LEN;
      crow.root.visible = c < 1;
      if (c < 1) {
        const x = -8 + c * 16;
        crow.root.position.set(x, 3.4 + Math.sin(c * Math.PI) * 0.6, -3);
        crow.root.rotation.y = Math.PI / 2;
        animateRig(crow, 'fly', t, t * 6);
      }
    });
  });
  return { ...handle, setVariant: (v) => setVariant(v) };
}
