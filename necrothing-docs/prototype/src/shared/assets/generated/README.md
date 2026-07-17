# Generated sprites (pixel-art)

Metti qui i PNG generati (es. con PixelLab). Nome file = **ID asset** del
manifest/Excel (`docs/production/asset-manifest.json`).

Esempi:
- `grave_gothic.png`, `grave_wood_cross.png`
- `deco_candle.png`, `deco_wreath.png`
- `env_fence_wood.png`, `tile_path_dirt.png`, `env_wall_stone.png`
- `currency_wisp.png`, `npc_priest.png`, `npc_mourner_a.png`

Varianti di stato col suffisso `__stato`, es: `grave_gothic__flowers.png`,
`grave_stone_simple__weeds.png`, `deco_candle__lit.png`.

Dimensioni consigliate (cella di gioco = 40px, render 2× per retina), canvas
**quadrato 1:1**, sfondo trasparente, pixel-art:
- **tombe** (footprint 2×2): **160×160** (reso ~74px, fattore `×2×0.92`)
- **placeable 1×1**: **80×80** · **2×2**: **160×160** · **3×3** (mausoleo/
  bottega): **256×256** (fattore `×0.96`)
- **wisp**: **80×80**

Disegna l'arte quasi a pieno canvas: il margine tra celle è già dato dal fattore
di render (<1). Tabella completa e razionale in
`docs/game-design/07-feature-registry.md` §10.

Appena trascini un file qui, lo sprite sostituisce automaticamente il
placeholder SVG (nessuna modifica al codice).
