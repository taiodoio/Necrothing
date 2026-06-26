# Asset Pipeline con PixelLab

Versione: `v0.1`

Guida operativa per generare gli asset pixel-art di NECROTHING con **PixelLab**
e inserirli nel prototipo. Vedi anche `02-asset-list.md`, `asset-manifest.json`,
`asset-list.xlsx` (brief per asset) e ADR 0003.

## Modi d'uso di PixelLab

- **Web app** (pixellab.ai) — generazione manuale, incluso "Create Map".
- **API REST** — a crediti (a pagamento).
- **MCP server** — usabile da Claude Code / Cursor per generare via chat.

Config MCP (token dopo registrazione su pixellab.ai):

```json
{
  "mcpServers": {
    "pixellab": {
      "url": "https://api.pixellab.ai/mcp",
      "transport": "http",
      "headers": { "Authorization": "Bearer YOUR_API_TOKEN" }
    }
  }
}
```

### Tool principali (MCP)

| Tool | Uso in NECROTHING |
|---|---|
| `create_character` (4/8 direzioni) | NPC: prete, persone in lutto, becchino, corvo, gatto |
| `animate_character` / `animate_with_text` / `animate_with_skeleton` | animazioni funerale e NPC |
| `create_topdown_tileset` (Wang) | terreno: erba, sentieri, bordi |
| `create_image_pixflux` / `create_image_bitforge` (+ stile di riferimento) | lapidi, decorazioni, strutture, UI |
| `create_isometric_tile` | (non necessario: la nostra mappa è top-down) |
| `get_balance` | crediti residui |

## Standard di stile (coerenza)

Includere in **ogni** generazione:

- **Stile**: «dark gothic pixel art, muted palette, soft rim light, flat
  shading, transparent background, top-down/3-quarter view».
- **Palette** (token del gioco): sfondo `#0d0b12`, pietra `#5d5678`, legno
  `#6b4a2b`, muschio `#4f6b3a`/`#789a4d`, candela `#e0a34a`/`#fff1c2`, viola
  spettrale `#9b87c4`, wisp `#9af5dd`.
- **Riferimento**: dopo i primi asset buoni, usarne uno come *style reference*
  (bitforge) per allineare i successivi.

## Dimensioni (tile base 32px, reso a 2×)

Gli oggetti si generano a **footprint × tile**:

| Oggetto | Footprint | Dimensione PNG |
|---|---|---|
| Tile terreno / struttura / decorazione 1×1 / wisp | 1×1 | 32×32 |
| Tomba | 2×2 | 64×64 |
| Salice / fontana | 2×2 | 64×64 |
| Mausoleo | 3×3 | 96×96 |
| NPC (figura) | — | 32×48 (o 48×64) |

Sfondo **trasparente**. Pixel-art reso con `image-rendering: pixelated`.

## Naming file (= ID asset del manifest)

Mettere i PNG in **`prototype/src/shared/assets/generated/`**.
Nome file = **ID asset** della colonna `ID` dell'Excel:

- Tombe: `grave_wood_cross.png`, `grave_stone_simple.png`, `grave_gothic.png`,
  `grave_broken.png`, `grave_angel.png`, `grave_obelisk.png`
- Decorazioni: `deco_candle.png`, `deco_wreath.png`, `deco_mushroom.png`,
  `deco_dead_tree.png`, `deco_skull.png`, `deco_lantern.png`, `deco_willow.png`
- Strutture: `tile_path_dirt.png`, `tile_path_stone.png`, `env_fence_wood.png`,
  `env_fence_iron.png`, `env_wall_stone.png`, `env_lamp_post.png`
- Terreno: `tile_grass.png` (usato come sfondo ripetuto della mappa)
- Moneta: `currency_wisp.png`
- NPC: `npc_priest.png`, `npc_mourner_a.png`, `npc_mourner_b.png`,
  `npc_mourner_child.png`, `npc_widow.png`, `npc_crow.png`

### Varianti di stato (suffisso `__stato`)

Opzionali; se presenti hanno priorità sulla base:

- `grave_gothic__flowers.png`, `grave_stone_simple__weeds.png`,
  `grave_wood_cross__flowers_weeds.png`
- `deco_candle__lit.png`
- `npc_priest__bless.png`, `npc_mourner_a__mourn.png`

(Nota: fiori/erbacce restano comunque indicati anche dai badge 🌿/💐 sulla
tomba, quindi le varianti di stato sono un di più estetico.)

## Come avviene la sostituzione

Il loader (`src/shared/assets/Sprite.tsx`) rileva i PNG in `generated/` a
build-time (`import.meta.glob`). I componenti sprite provano prima il PNG e, se
assente, usano il placeholder SVG. **Basta trascinare i file** e ricostruire:
nessuna modifica al codice. La griglia e l'editor (sposta/ruota/cambia)
continuano a funzionare con gli sprite raster.

## Mappa: tileset Wang

Generare `create_topdown_tileset(lower="terra", upper="erba cimiteriale")` e i
sentieri. Per l'MVP basta una `tile_grass.png` coerente come sfondo; in seguito
si può introdurre un vero set auto-connesso per bordi erba/terra e curve dei
sentieri.

## Animazioni

- Esportare spritesheet orizzontali (frame uniformi).
- Render: CSS `steps(n)` su `background-position`, oppure scambio frame.
- Priorità: candela (loop), wisp (bob/glow), prete `bless`, persone `walk`.

## Ordine consigliato (per priorità Excel)

1. **P0**: `tile_grass`, `grave_wood_cross`, `grave_stone_simple`,
   `deco_candle`, `currency_wisp`, `env_fence_wood`, `tile_path_dirt`,
   icona app.
2. **P1**: ambiente (luna/cancello), NPC funerale (`npc_priest`,
   `npc_mourner_*`), `grave_gothic`, `grave_broken`, badge ranghi.
3. **P2+**: stagioni, decorazioni extra, FX, mausolei.
