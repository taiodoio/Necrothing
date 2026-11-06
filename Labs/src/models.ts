import { LP, type LPModel } from '../../Production/src/render/lowpoly/kit.ts';
import { cryptLP } from '../../Production/src/render/lowpoly/cryptModels.ts';
import { keeperHouseLP, gravediggerHouseLP, shopLP } from '../../Production/src/render/lowpoly/architecture.ts';
import { decayLP } from '../../Production/src/render/lowpoly/lights.ts';
import { yard } from './cryptYards.ts';
import type { CryptCtx } from '../../Production/src/render/lowpoly/cryptKit.ts';
import type { PVis } from '../../Production/src/render/types.ts';
import { BUILDINGS } from './cryptBuildings.ts';
import { VILLAGE_BUILDINGS, VILLAGE_YARDS, type VillageFamily } from './villageHouses.ts';
import { weatheredHouse } from './weathering.ts';

export const cases = [
  { id:'ghost-1', family:'ghost', variant:0, name:'Casa infestata · I', detail:'Torretta a destra, finestra doppia, laghetto e aiuola fiorita.' },
  { id:'ghost-2', family:'ghost', variant:1, name:'Casa infestata · II', detail:'Torretta a sinistra e finestra doppia con davanzale.' },
  { id:'ghost-3', family:'ghost', variant:2, name:'Casa infestata · III', detail:'Torretta con guglia e bow window sulla facciata.' },
  { id:'florist', family:'florist', variant:0, name:'Serra del fioraio', detail:'Casa più larga, serra accostata e aiuole di fiori.' },
  { id:'rectory', family:'rectory', variant:0, name:'Canonica', detail:'Facciata più ampia, sacrestia e campaniletto sul colmo.' },
  { id:'lamplighter', family:'lamplighter', variant:0, name:'Casa del lampionaio', detail:'Abitazione allargata con laboratorio laterale.' },
  { id:'reaper', family:'reaper', variant:0, name:'Casetta del Mietitore', detail:'Orologio sull’abbaino, legnaia e orto ricomposto.' },
] as const;
export type LabCase = typeof cases[number];
export type Condition = 'intact'|'dirty'|'broken';
const visual = (item:LabCase, night:boolean, condition:Condition):PVis => ({type:`crypt_${item.family}`, variant:item.variant, seed:1, lit:night, dirty:condition==='dirty', broken:condition==='broken'});
export function original(item:LabCase, night:boolean, condition:Condition):LPModel { return cryptLP(visual(item,night,condition)); }
export function proposed(item:LabCase, night:boolean, condition:Condition):LPModel {
  const v=visual(item,night,condition), lp=new LP(`lab:${v.type}:${v.variant}:${v.seed}:${+v.dirty}${+v.broken}`);
  const family=item.family;
  const c:CryptCtx={lp,v,family,variant:(item.variant+1) as 1|2|3,lit:v.lit&&!v.broken};
  lp.push([0,0,-0.7]);
  if(family==='ghost') BUILDINGS.ghost(c); else VILLAGE_BUILDINGS[family as VillageFamily](c);
  weatheredHouse(c, false);
  lp.pop();
  // Riduce la profondità del cortile originale, non quella della casa o dei suoi dettagli.
  lp.push([0,0,0],0,0,0,[1,1,0.74]);
  if(family==='ghost') yard(c); else VILLAGE_YARDS[family as VillageFamily](c);
  lp.pop();
  decayLP(lp,v,4.3,3.3);
  return lp.build();
}
export function reference(which:'keeper'|'gravedigger'|'shop',night:boolean):LPModel {
  const v:PVis={type:which==='keeper'?'keeper_house':which==='gravedigger'?'gravedigger_house':'shop',variant:0,seed:1,lit:night,dirty:false,broken:false};
  return which==='keeper'?keeperHouseLP(v):which==='gravedigger'?gravediggerHouseLP(v):shopLP(v);
}
