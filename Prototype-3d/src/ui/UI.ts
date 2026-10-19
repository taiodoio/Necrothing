// UI di gioco: HUD, bolla d'azione, menù contestuale ancorato all'oggetto,
// barra di posizionamento, banner Modifica, tutorial. Le schermate nei drawer
// sono in screens.ts.

import { areaBanner, openExpansionOffer } from './expansion.ts';
import type * as THREE from 'three';
import type { EntityAction, Game } from '../app/Game.ts';
import { DECAY } from '../game/balance.ts';
import { CATALOG, isPetHouse, repairCost } from '../game/catalog.ts';
import { GRAVE_STATE_LABELS, GRAVE_TYPE_LABELS, graveVisualState } from '../game/graves.ts';
import { nextRank, rankForXp, rankProgress } from '../game/progression.ts';
import * as R from '../game/rules.ts';
import type { BurialDraft } from '../game/rules.ts';
import { DAY_PHASE_LABELS } from '../game/time.ts';
import { $, closeDrawer, drawerOpen, h, toast } from './dom.ts';
import { hydrateIcons, icon, iconUrl, installFrames } from './icons.ts';
import { uiNext } from '../app/uiNext.ts';
import * as S from './screens.ts';
import * as T from './memoryTree.ts';

/** Icona del pulsante del menù di gioco: la pala, o le tre righe con l'interfaccia nuova. */
const fabIcon = () => (uiNext() ? 'menu' : 'shovel');

const WEATHER_LABELS = { clear: 'Sereno', fog: 'Nebbia', rain: 'Pioggia', storm: 'Temporale' } as const;
const PHASE_ICONS = { dawn: 'dawn', day: 'sun', dusk: 'dusk', night: 'moon' } as const;
const WEATHER_ICONS = { clear: '', fog: 'fog', rain: 'rain', storm: 'rain' } as const;

export class UI {
  readonly game: Game;
  private ctxId: string | null = null;
  /** Menù ancorato a un personaggio (animale, Custode) invece che a un oggetto. */
  private ctxAnchor: (() => THREE.Vector3 | null) | null = null;
  private placementBar: HTMLElement | null = null;
  private tutorial: HTMLElement | null = null;

  constructor(game: Game) {
    this.game = game;
    installFrames();
    hydrateIcons();
    if (uiNext()) { $('#fab-icon').style.backgroundImage = iconUrl(fabIcon()); $('#fab').setAttribute('aria-label', 'Menù'); }
    $('#fab').addEventListener('click', () => this.toggleBubble());
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-act]')) {
      b.addEventListener('click', () => { this.closeBubble(); this.bubbleAction(b.dataset.act!); });
    }
    $('#player-chip').addEventListener('click', () => S.openPlayer(this));
    $('#settings-btn').addEventListener('click', () => S.openSettings(this));
    $('#drawer-close').addEventListener('click', () => closeDrawer());
    $('#scrim').addEventListener('click', () => closeDrawer());
    $('#edit-done').addEventListener('click', () => game.setEditMode(false));
    $('#recenter').addEventListener('click', () => game.recenter());
    $('#bike-toggle').addEventListener('click', () => game.toggleBike());
    $('#broom-toggle').addEventListener('click', () => game.toggleBroom());
    $('#staff-toggle').addEventListener('click', () => game.toggleStaff());
    this.refreshSettingsButtons();
    this.refreshEditBanner();
  }

  // ── HUD ──────────────────────────────────────────────────────────────

  refreshHud() {
    const p = this.game.state.player;
    const rank = rankForXp(p.xp);
    const next = nextRank(p.xp);
    $('#hud-name').textContent = p.name;
    $('#hud-rank').textContent = `Rango ${rank.level} · ${rank.name}${next ? '' : ' ★'}`;
    ($('#hud-xp') as HTMLElement).style.width = `${Math.round(rankProgress(p.xp) * 100)}%`;
    $('#hud-wisps').textContent = String(p.wisps);
    this.refreshClock();
  }

  bumpWisps() {
    const el = $('.wisp-count');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  refreshClock() {
    const now = this.game.now();
    $('#hud-clock').textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const phase = this.game.getPhase();
    const w = this.game.state.world.weather;
    const el = $('#hud-weather');
    const key = `${phase}|${w}|${window.innerWidth < 420}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.replaceChildren(icon(WEATHER_ICONS[w] || PHASE_ICONS[phase], 14), window.innerWidth < 420 ? WEATHER_LABELS[w] : `${DAY_PHASE_LABELS[phase]} · ${WEATHER_LABELS[w]}`);
  }

  refreshDebug(text: string) {
    const d = $('#debug');
    d.hidden = !this.game.state.settings.showDebug;
    if (!d.hidden) d.textContent = text;
  }

  refreshSettingsButtons() {
    // bicicletta: l'icona c'è solo se la si possiede; dorata quando il Custode è in sella
    const bike = $('#bike-toggle') as HTMLButtonElement;
    const riding = this.game.riding;
    bike.hidden = !this.game.ownsBike();
    bike.classList.toggle('active', riding);
    bike.setAttribute('aria-pressed', String(riding));
    bike.setAttribute('aria-label', riding ? 'Scendi dalla bici' : 'Sali in bici');
    // scopa volante e bastone mistico: sopra la bici, solo se li si possiede
    const broom = $('#broom-toggle') as HTMLButtonElement, flying = this.game.flying;
    broom.hidden = !this.game.ownsBroom();
    broom.classList.toggle('active', flying);
    broom.setAttribute('aria-pressed', String(flying));
    broom.setAttribute('aria-label', flying ? 'Scendi dalla scopa' : 'Sali sulla scopa');
    const staff = $('#staff-toggle') as HTMLButtonElement, held = this.game.staffOn;
    staff.hidden = !this.game.ownsStaff();
    staff.classList.toggle('active', held);
    staff.setAttribute('aria-pressed', String(held));
    staff.setAttribute('aria-label', held ? 'Posa il bastone mistico' : 'Impugna il bastone mistico');
    if (drawerOpen() && document.querySelector('[data-settings]')) S.openSettings(this);
  }

  // ── Bolla d'azione ───────────────────────────────────────────────────

  toggleBubble() {
    const b = $('#bubble');
    const open = !b.classList.contains('open');
    b.classList.toggle('open', open);
    $('#fab').setAttribute('aria-expanded', String(open));
    $('#fab-icon').style.backgroundImage = iconUrl(open ? 'close' : fabIcon());
    for (const s of document.querySelectorAll<HTMLElement>('.slot')) s.classList.toggle('active', s.dataset.act === 'edit' && this.game.editMode);
  }

  closeBubble() {
    $('#bubble').classList.remove('open');
    $('#fab').setAttribute('aria-expanded', 'false');
    $('#fab-icon').style.backgroundImage = iconUrl(fabIcon());
  }

  private bubbleAction(act: string) {
    const g = this.game;
    if (g.placement) g.cancelPlacement();
    switch (act) {
      case 'bury': S.openBurial(this); break;
      case 'edit':
        if (g.editMode) { g.setEditMode(false); break; }
        if (!g.state.settings.editIntroSeen) S.openEditIntro(this);
        else { g.setEditMode(true); toast('Modifica: tocca un elemento e trascinalo.'); }
        break;
      case 'inventory': S.openInventory(this); break;
      case 'shop': g.centerOnShop(); break;
      case 'photo': S.startPhoto(this); break;
      case 'gallery': S.openGallery(this); break;
    }
  }

  openShop() { S.openShop(this); }
  openDetail(id: string) { S.openDetail(this, id); }
  openEntrust(graveId: string) { T.openEntrust(this, graveId); }
  openMemoryTree() { T.openMemoryTree(this); }
  openMemory(id: string, visit?: R.ActionResult) { T.openMemory(this, id, visit); }
  reopenBurial(draft: BurialDraft) { S.openBurial(this, draft, 5); }

  refreshEditBanner() {
    // durante la riduzione del recinto le istruzioni le dà il suo banner
    $('#edit-banner').hidden = !this.game.editMode || !!this.game.placement || !!this.game.shrink;
  }

  /** Banner della riduzione del recinto (null lo toglie). */
  refreshAreaBanner(left: number | null) {
    document.querySelector('#area-banner')?.remove();
    this.refreshEditBanner();
    if (left === null || !this.game.shrink) { $('#bubble').classList.remove('hidden'); return; }
    $('#bubble').classList.add('hidden');
    $('#game').append(areaBanner(this, left));
  }

  openExpansionOffer(level: number) { openExpansionOffer(this, level); }

  escape() {
    if (drawerOpen()) { closeDrawer(); return; }
    if (this.game.placement) { this.game.cancelPlacement(); return; }
    if (this.game.selection) { this.game.select(null); return; }
    if (this.game.editMode) this.game.setEditMode(false);
  }

  // ── Menù contestuale ─────────────────────────────────────────────────

  closeContext() {
    $('#ctx').hidden = true;
    this.ctxId = null;
    this.ctxAnchor = null;
  }

  /** Chiude il menù di un personaggio (se aperto), lasciando stare quello degli oggetti. */
  closeActorMenu() { if (this.ctxAnchor) this.closeContext(); }

  /** Menù sopra un personaggio: azioni con la loro funzione, segue il personaggio mentre si muove. */
  openActorMenu(title: string, sub: string, actions: Array<{ label: string; icon: string; cls?: string; disabled?: boolean; run: () => void }>, anchor: () => THREE.Vector3 | null) {
    this.game.select(null);
    this.ctxId = null;
    this.ctxAnchor = anchor;
    $('#ctx-title').replaceChildren(document.createTextNode(title), h('small', {}, sub));
    $('#ctx-actions').replaceChildren(...actions.map((a) => this.runButton(a)));
    $('#ctx').hidden = false;
    this.positionContext();
  }

  private runButton(a: { label: string; icon: string; cls?: string; disabled?: boolean; run: () => void }) {
    const run = () => { this.closeContext(); this.game.select(null); a.run(); };
    if (uiNext()) return h('button', { class: a.cls ?? '', disabled: !!a.disabled, 'aria-label': a.label, title: a.label, onclick: run }, icon(a.icon, 28));
    return h('button', { class: a.cls ?? '', disabled: !!a.disabled, onclick: run }, icon(a.icon, 20), a.label);
  }

  refreshContext() {
    const sel = this.game.selection;
    if (!sel && this.ctxAnchor) return; // resta aperto il menù del personaggio
    if (!sel || this.game.placement || drawerOpen()) { this.closeContext(); return; }
    // interfaccia nuova: l'oggetto è evidenziato, il menù aspetta che il Custode ci arrivi
    if (uiNext() && !this.game.editMode && !this.game.ctxReady) { this.closeContext(); return; }
    const icons = uiNext();
    const s = this.game.state;
    const actions: Array<{ act: EntityAction; label: string; icon: string; cls?: string; cost?: number }> = [];
    let petActions: ReturnType<Game['petMenu']> = [];
    let title = '';
    let sub = '';
    if (sel.kind === 'grave') {
      const g = s.graves.find((x) => x.id === sel.id);
      if (!g) { this.closeContext(); return; }
      const vs = graveVisualState(g);
      title = g.name;
      sub = `${GRAVE_TYPE_LABELS[g.graveType]} · ${GRAVE_STATE_LABELS[vs]}`;
      if (this.game.editMode) {
        actions.push({ act: 'detail', label: 'Dettagli', icon: 'search' }, { act: 'exhume', label: 'Esuma', icon: 'shovel', cls: 'danger' }, { act: 'confirm', label: 'Fatto', icon: 'check', cls: 'primary' });
      } else {
        actions.push({ act: 'detail', label: 'Dettagli', icon: 'search' });
        // interfaccia nuova: «Affida all'albero» resta solo nel dettaglio della tomba
        if (!icons && s.placeables.some((p) => p.type === 'memory_tree')) actions.push({ act: 'entrust', label: 'Affida all’albero', icon: 'tree' });
        if (g.broken) actions.push({ act: 'repair', label: 'Ripara', icon: 'hammer', cls: 'primary', cost: DECAY.graveRepairCost });
        else if (g.dirty || g.weeds) actions.push({ act: 'clean', label: 'Pulisci', icon: 'broom', cls: 'primary' });
        else actions.push({ act: 'flowers', label: g.hasFlowers ? 'Rinnova fiori' : 'Porta fiori', icon: 'flower', cls: 'primary' });
      }
    } else {
      const p = s.placeables.find((x) => x.id === sel.id);
      if (!p) { this.closeContext(); return; }
      const def = CATALOG[p.type];
      title = def.label;
      sub = p.broken ? 'Rotto' : p.dirty ? 'Sporco' : def.light ? (p.lit ? 'Acceso' : 'Spento') : def.category === 'npc' ? 'Presenza' : 'In ordine';
      if (this.game.editMode) {
        if (def.rotatable) actions.push({ act: 'rotate', label: 'Ruota', icon: 'variant' });
        if (!def.permanent) actions.push({ act: 'store', label: 'Riponi', icon: 'bag', cls: 'danger' });
        actions.push({ act: 'confirm', label: 'Fatto', icon: 'check', cls: 'primary' });
      } else {
        if (p.type === 'shop') actions.push({ act: 'shop', label: 'Entra in bottega', icon: 'shop', cls: 'primary' });
        if (p.type === 'memory_tree') { actions.push({ act: 'memories', label: 'Ricordi', icon: 'tree', cls: 'primary' }); sub = `${s.entrusted.length} ${s.entrusted.length === 1 ? 'ricordo' : 'ricordi'}`; }
        if (p.type === 'soul_bell' && !p.broken) {
          const ready = R.bellReady(s, p.id, this.game.now());
          if (ready) actions.push({ act: 'ring', label: 'Suona la campana', icon: 'bell', cls: 'primary' });
          sub = `${sub} · ${ready ? 'Pronta a suonare' : 'Ha già suonato oggi'}`;
        }
        actions.push({ act: 'detail', label: 'Dettagli', icon: 'search' });
        if (p.broken) actions.push({ act: 'repair', label: 'Ripara', icon: 'hammer', cls: 'primary', cost: repairCost(def) });
        else if (p.dirty) actions.push({ act: 'clean', label: 'Pulisci', icon: 'broom' });
        if (def.light && !p.broken) actions.push({ act: 'light', label: p.lit ? 'Spegni' : 'Accendi', icon: p.lit ? 'lightOff' : 'lightOn' });
        // la casetta porta anche il menù del suo animale (utile quando dorme in tana)
        if (isPetHouse(p.type)) { petActions = this.game.petMenu(p.id); sub = `${sub} · ${this.game.petStatus(p.id)}`; }
      }
    }
    this.ctxId = sel.id;
    $('#ctx-title').replaceChildren(document.createTextNode(title), h('small', {}, sub));
    $('#ctx-actions').replaceChildren(...actions.map((a) => icons
      // solo l'icona (il nome resta per i lettori di schermo); il costo in un angolino
      ? h('button', { class: a.cls ?? '', 'aria-label': a.cost ? `${a.label} (${a.cost} fuochi fatui)` : a.label, title: a.label, onclick: () => this.game.performEntityAction(sel.id, a.act) },
        icon(a.icon, 28), a.cost ? h('em', {}, String(a.cost)) : null)
      : h('button', {
        class: a.cls ?? '',
        onclick: () => this.game.performEntityAction(sel.id, a.act),
      }, icon(a.icon, 20), a.label, a.cost ? h('em', {}, ` −${a.cost}`, icon('wisp', 12)) : null)), ...petActions.map((a) => this.runButton(a)));
    $('#ctx').hidden = false;
    this.positionContext();
  }

  private positionContext() {
    if (!this.ctxId && !this.ctxAnchor) return;
    const top = this.ctxAnchor ? this.ctxAnchor() : this.game.world.entityTop(this.ctxId!);
    const p = top ? this.game.project(top) : null;
    const el = $('#ctx');
    if (!p) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    const w = el.offsetWidth || 200;
    const x = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, p.x));
    const y = Math.max(el.offsetHeight + 74, Math.min(window.innerHeight - 90, p.y - 6));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  // ── Posizionamento ───────────────────────────────────────────────────

  refreshPlacementBar() {
    const p = this.game.placement;
    this.refreshEditBanner();
    if (!p) { this.placementBar?.remove(); this.placementBar = null; $('#bubble').classList.remove('hidden'); return; }
    this.closeContext();
    $('#bubble').classList.add('hidden');
    const label = p.kind === 'grave' ? `Dove riposerà ${p.draft!.name}?` : CATALOG[p.type!].label;
    const rot = p.kind === 'item' && CATALOG[p.type!].rotatable;
    const bar = h('div', { class: 'tutorial' },
      h('b', {}, icon(p.kind === 'grave' ? 'bury' : 'target', 18), label),
      h('span', { class: 'muted' }, p.valid ? 'Tocca il terreno o trascina per spostare, poi conferma.' : 'Spazio occupato: scegli un punto libero.'),
      h('div', { class: 'row' },
        h('button', { class: 'pill', onclick: () => this.game.cancelPlacement() }, 'Annulla'),
        rot ? h('button', { class: 'pill', onclick: () => this.game.rotatePlacement() }, icon('variant', 16), 'Ruota') : null,
        h('button', { class: 'pill primary', disabled: !p.valid, onclick: () => this.game.confirmPlacement() }, p.kind === 'grave' ? 'Seppellisci qui' : 'Conferma'),
      ),
    );
    if (this.placementBar) this.placementBar.replaceWith(bar); else $('#game').append(bar);
    this.placementBar = bar;
  }

  // ── Tutorial ─────────────────────────────────────────────────────────

  maybeTutorial() {
    const s = this.game.state.settings;
    if (s.shopTutorialDone) return;
    setTimeout(() => {
      this.game.centerOnShop();
      this.game.select(null);
      const card = h('div', { class: 'tutorial' },
        h('b', {}, 'Benvenuto, Custode.'),
        h('span', {}, 'Questa è la Bottega: qui compri lampioni, statue, presenze e tutto ciò che serve al cimitero, pagando in fuochi fatui. Toccala per entrare; in Modifica puoi spostarla dove vuoi.'),
        h('span', { class: 'muted' }, 'Il vecchio custode ha lasciato tre tombe trascurate: puliscile e porta loro dei fiori. Tocca il terreno per camminare.'),
        h('button', { class: 'big-btn', onclick: () => { s.shopTutorialDone = true; card.remove(); this.tutorial = null; this.game.recenter(); this.game.afterChange(); } }, 'Ho capito'),
      );
      this.tutorial = card;
      $('#game').append(card);
    }, 1200);
  }

  /** Chiamato ogni frame: riposiziona il menù contestuale. */
  frame() {
    if ((this.ctxId || this.ctxAnchor) && !$('#ctx').hidden) this.positionContext();
  }
}
