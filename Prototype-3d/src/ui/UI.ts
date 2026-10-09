// UI di gioco: HUD, bolla d'azione, menù contestuale ancorato all'oggetto,
// barra di posizionamento, banner Modifica, tutorial. Le schermate nei drawer
// sono in screens.ts.

import type { EntityAction, Game } from '../app/Game.ts';
import { DECAY } from '../game/balance.ts';
import { CATALOG, repairCost } from '../game/catalog.ts';
import { GRAVE_STATE_LABELS, GRAVE_TYPE_LABELS, graveVisualState } from '../game/graves.ts';
import { nextRank, rankForXp, rankProgress } from '../game/progression.ts';
import type { BurialDraft } from '../game/rules.ts';
import { DAY_PHASE_LABELS } from '../game/time.ts';
import { $, closeDrawer, drawerOpen, h, toast } from './dom.ts';
import * as S from './screens.ts';

const WEATHER_LABELS = { clear: 'Sereno', fog: 'Nebbia', rain: 'Pioggia', storm: 'Temporale' } as const;
const PHASE_ICONS = { dawn: '🌅', day: '☀️', dusk: '🌆', night: '🌙' } as const;

export class UI {
  readonly game: Game;
  private ctxId: string | null = null;
  private placementBar: HTMLElement | null = null;
  private tutorial: HTMLElement | null = null;

  constructor(game: Game) {
    this.game = game;
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
    $('#cam-toggle').addEventListener('click', () => game.setCamera(game.state.settings.camera === 'angled' ? 'top' : 'angled'));
    this.refreshSettingsButtons();
    this.refreshEditBanner();
  }

  // ── HUD ──────────────────────────────────────────────────────────────

  refreshHud() {
    const p = this.game.state.player;
    const rank = rankForXp(p.xp);
    const next = nextRank(p.xp);
    $('#hud-name').textContent = p.name;
    $('#hud-rank').textContent = `${rank.level} · ${rank.name}${next ? '' : ' ★'}`;
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
    $('#hud-weather').textContent = `${PHASE_ICONS[phase]} ${window.innerWidth < 420 ? WEATHER_LABELS[w] : `${DAY_PHASE_LABELS[phase]} · ${WEATHER_LABELS[w]}`}`;
  }

  refreshDebug(text: string) {
    const d = $('#debug');
    d.hidden = !this.game.state.settings.showDebug;
    if (!d.hidden) d.textContent = text;
  }

  refreshSettingsButtons() {
    const cam = this.game.state.settings.camera;
    $('#cam-toggle').textContent = cam === 'angled' ? '⊞' : '◇';
    $('#cam-toggle').setAttribute('aria-label', cam === 'angled' ? 'Vista dall’alto' : 'Vista obliqua');
    if (drawerOpen() && document.querySelector('[data-settings]')) S.openSettings(this);
  }

  // ── Bolla d'azione ───────────────────────────────────────────────────

  toggleBubble() {
    const b = $('#bubble');
    const open = !b.classList.contains('open');
    b.classList.toggle('open', open);
    $('#fab').setAttribute('aria-expanded', String(open));
    for (const s of document.querySelectorAll<HTMLElement>('.slot')) s.classList.toggle('active', s.dataset.act === 'edit' && this.game.editMode);
  }

  closeBubble() {
    $('#bubble').classList.remove('open');
    $('#fab').setAttribute('aria-expanded', 'false');
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
  reopenBurial(draft: BurialDraft) { S.openBurial(this, draft, 4); }

  refreshEditBanner() {
    $('#edit-banner').hidden = !this.game.editMode || !!this.game.placement;
  }

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
  }

  refreshContext() {
    const sel = this.game.selection;
    if (!sel || this.game.placement || drawerOpen()) { this.closeContext(); return; }
    const s = this.game.state;
    const actions: Array<{ act: EntityAction; label: string; cls?: string; cost?: number }> = [];
    let title = '';
    let sub = '';
    if (sel.kind === 'grave') {
      const g = s.graves.find((x) => x.id === sel.id);
      if (!g) { this.closeContext(); return; }
      const vs = graveVisualState(g);
      title = g.name;
      sub = `${GRAVE_TYPE_LABELS[g.graveType]} · ${GRAVE_STATE_LABELS[vs]}`;
      if (this.game.editMode) {
        actions.push({ act: 'detail', label: '🔍 Dettagli' }, { act: 'exhume', label: '🗑 Esuma', cls: 'danger' }, { act: 'confirm', label: '✓ Fatto', cls: 'primary' });
      } else {
        actions.push({ act: 'detail', label: '🔍 Dettagli' });
        if (g.broken) actions.push({ act: 'repair', label: '🛠 Ripara', cls: 'primary', cost: DECAY.graveRepairCost });
        else if (g.dirty || g.weeds) actions.push({ act: 'clean', label: '🧹 Pulisci', cls: 'primary' });
        else actions.push({ act: 'flowers', label: g.hasFlowers ? '💐 Rinnova fiori' : '💐 Porta fiori', cls: 'primary' });
      }
    } else {
      const p = s.placeables.find((x) => x.id === sel.id);
      if (!p) { this.closeContext(); return; }
      const def = CATALOG[p.type];
      title = def.label;
      sub = p.broken ? 'Rotto' : p.dirty ? 'Sporco' : def.light ? (p.lit ? 'Acceso' : 'Spento') : def.category === 'npc' ? 'Presenza' : 'In ordine';
      if (this.game.editMode) {
        if (def.rotatable) actions.push({ act: 'rotate', label: '⟳ Ruota' });
        if ((def.variants ?? 1) > 1) actions.push({ act: 'variant', label: '🎨 Variante' });
        if (!def.permanent) actions.push({ act: 'store', label: '🎒 Riponi', cls: 'danger' });
        actions.push({ act: 'confirm', label: '✓ Fatto', cls: 'primary' });
      } else {
        if (p.type === 'shop') actions.push({ act: 'shop', label: '🛒 Entra in bottega', cls: 'primary' });
        actions.push({ act: 'detail', label: '🔍 Dettagli' });
        if (p.broken) actions.push({ act: 'repair', label: '🛠 Ripara', cls: 'primary', cost: repairCost(def) });
        else if (p.dirty) actions.push({ act: 'clean', label: '🧹 Pulisci' });
        if (def.light && !p.broken) actions.push({ act: 'light', label: p.lit ? '🌑 Spegni' : '💡 Accendi' });
      }
    }
    this.ctxId = sel.id;
    $('#ctx-title').replaceChildren(document.createTextNode(title), h('small', {}, sub));
    $('#ctx-actions').replaceChildren(...actions.map((a) => h('button', {
      class: a.cls ?? '',
      onclick: () => this.game.performEntityAction(sel.id, a.act),
    }, a.label, a.cost ? h('em', {}, ` −${a.cost}✦`) : null)));
    $('#ctx').hidden = false;
    this.positionContext();
  }

  private positionContext() {
    if (!this.ctxId) return;
    const top = this.game.world.entityTop(this.ctxId);
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
    const label = p.kind === 'grave' ? `⚰️ Dove riposerà ${p.draft!.name}?` : `📍 ${CATALOG[p.type!].label}`;
    const rot = p.kind === 'item' && CATALOG[p.type!].rotatable;
    const bar = h('div', { class: 'tutorial' },
      h('b', {}, label),
      h('span', { class: 'muted' }, p.valid ? 'Tocca il terreno o trascina per spostare, poi conferma.' : 'Spazio occupato: scegli un punto libero.'),
      h('div', { class: 'row' },
        h('button', { class: 'pill', onclick: () => this.game.cancelPlacement() }, 'Annulla'),
        rot ? h('button', { class: 'pill', onclick: () => this.game.rotatePlacement() }, '⟳ Ruota') : null,
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
        h('span', {}, 'Questa è la Bottega: qui compri lampioni, statue, presenze e tutto ciò che serve al cimitero, pagando in fuochi fatui ✦. Toccala per entrare; in Modifica puoi spostarla dove vuoi.'),
        h('span', { class: 'muted' }, 'Il vecchio custode ha lasciato tre tombe trascurate: puliscile e porta loro dei fiori. Tocca il terreno per camminare.'),
        h('button', { class: 'big-btn', onclick: () => { s.shopTutorialDone = true; card.remove(); this.tutorial = null; this.game.recenter(); this.game.afterChange(); } }, 'Ho capito'),
      );
      this.tutorial = card;
      $('#game').append(card);
    }, 1200);
  }

  /** Chiamato ogni frame: riposiziona il menù contestuale. */
  frame() {
    if (this.ctxId && !$('#ctx').hidden) this.positionContext();
  }
}
