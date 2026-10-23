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
import { currentLang, t } from '../i18n/index.ts';
import { $, applyPageTexts, closeDrawer, drawerOpen, h, joinDot, toast } from './dom.ts';
import { hydrateIcons, icon, iconUrl, installFrames } from './icons.ts';
import { uiNext, uiPlay, uiPreview, uiTrial } from '../app/uiNext.ts';
import { custodePortrait } from './lookThumbs.ts';
import { shortWisps } from './numbers.ts';
import * as S from './screens.ts';
import * as H from './house.ts';
import * as T from './memoryTree.ts';

/** Icona del pulsante del menù di gioco: la pala, o le tre righe con l'interfaccia nuova. */
const fabIcon = () => (uiNext() ? 'menu' : 'shovel');

const WEATHER_LABELS = { clear: t('hud.weather.clear'), fog: t('hud.weather.fog'), rain: t('hud.weather.rain'), storm: t('hud.weather.storm') } as const;
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
    applyPageTexts();
    installFrames();
    if (uiNext()) {
      // riquadro del Custode compatto: sotto il nome, barra del rango e fuochi fatui sulla stessa riga;
      // il rango è il numerino sull'angolo del ritratto (il nome del rango è nel profilo)
      const row = h('div', { class: 'xp-row' });
      $('.chip-body .xp-bar').before(row);
      row.append($('.chip-body .xp-bar'), $('.wisp-count'));
      $('#player-chip').append(h('span', { class: 'rank-badge', id: 'hud-rank-badge', 'aria-hidden': 'true' }));
      // le Impostazioni sono l'ultima voce del menù (niente più ingranaggio in alto)
      $('#settings-btn').remove();
      $('#slots').append(h('button', { class: 'slot', 'data-act': 'settings' }, h('i', { 'data-icon': 'gear' }), h('small', {}, t('menu.settings'))));
      // Seppellisci a portata di dito, sopra il pulsante del menù (resta anche nel menù)
      $('#fab').after(h('button', { class: 'fab bury-fab', id: 'bury-fab', 'aria-label': t('menu.bury'), onclick: () => { this.closeBubble(); this.bubbleAction('bury'); } }, h('i', { 'data-icon': 'bury' })));
    }
    hydrateIcons();
    if (uiNext()) {
      $('#fab-icon').style.backgroundImage = iconUrl(fabIcon());
      $('#fab').setAttribute('aria-label', t('menu.fab.aria'));
      // banner di Modifica: testo breve (intero anche sul telefono) e «Fine» come azione principale
      $('#edit-banner span').textContent = t('hud.edit.banner');
      $('#edit-done').classList.add('primary');
    }
    $('#fab').addEventListener('click', () => this.toggleBubble());
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-act]')) {
      b.addEventListener('click', () => { this.closeBubble(); this.bubbleAction(b.dataset.act!); });
    }
    $('#player-chip').addEventListener('click', () => S.openPlayer(this));
    document.getElementById('settings-btn')?.addEventListener('click', () => S.openSettings(this));
    $('#drawer-close').addEventListener('click', () => closeDrawer());
    $('#scrim').addEventListener('click', () => closeDrawer());
    $('#edit-done').addEventListener('click', () => game.setEditMode(false));
    $('#recenter').addEventListener('click', () => game.recenter());
    $('#bike-toggle').addEventListener('click', () => game.toggleBike());
    $('#broom-toggle').addEventListener('click', () => game.toggleBroom());
    $('#staff-toggle').addEventListener('click', () => game.toggleStaff());
    // da pipistrello, il pulsante per tornare Custode (coi secondi che restano)
    if (uiPreview()) {
      const bat = h('button', { class: 'icon-btn bat-btn', id: 'bat-toggle', 'aria-label': t('hud.bat.aria'), hidden: true, onclick: () => game.endBat() }, icon('bat', 26), h('em', { class: 'bat-left' }, ''));
      $('#staff-toggle').before(bat);
    }
    this.refreshSettingsButtons();
    this.refreshEditBanner();
  }

  // ── HUD ──────────────────────────────────────────────────────────────

  refreshHud() {
    const p = this.game.state.player;
    const rank = rankForXp(p.xp);
    const next = nextRank(p.xp);
    $('#hud-name').textContent = p.name;
    $('#hud-rank').textContent = t(next ? 'hud.rank' : 'hud.rankMax', { level: rank.level, name: rank.name });
    document.getElementById('hud-rank-badge')?.replaceChildren(String(rank.level));
    ($('#hud-xp') as HTMLElement).style.width = `${Math.round(rankProgress(p.xp) * 100)}%`;
    // interfaccia nuova: nel riquadro il ritratto vero del Custode (col suo aspetto)
    if (uiNext()) {
      const url = custodePortrait(p.look, uiPlay());
      const box = $('.chip-avatar');
      if (url && box.dataset.src !== url) { box.dataset.src = url; box.replaceChildren(h('img', { src: url, alt: '' })); }
    }
    // interfaccia nuova: il numero intero coi punti delle migliaia, abbreviato solo da 100.000 (125k, 1,2 mln)
    $('#hud-wisps').textContent = uiNext() ? shortWisps(p.wisps) : String(p.wisps);
    if (uiNext()) $('.wisp-count').setAttribute('aria-label', t('hud.wispsAria', { n: p.wisps.toLocaleString(currentLang()) }));
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
    $('#hud-clock').textContent = now.toLocaleTimeString(currentLang(), { hour: '2-digit', minute: '2-digit' });
    const phase = this.game.getPhase();
    const w = this.game.state.world.weather;
    const el = $('#hud-weather');
    const key = `${phase}|${w}|${window.innerWidth < 420}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    // interfaccia nuova: sotto l'ora un'icona sola per fase e meteo (la luna con le stelle, il sole nella nebbia…)
    if (uiNext()) {
      const label = t('hud.phaseWeather', { phase: DAY_PHASE_LABELS[phase], weather: WEATHER_LABELS[w] });
      el.replaceChildren(icon(`sky-${phase}-${w}`, 24));
      el.setAttribute('aria-label', label);
      el.title = label;
      return;
    }
    el.replaceChildren(icon(WEATHER_ICONS[w] || PHASE_ICONS[phase], 14), window.innerWidth < 420 ? WEATHER_LABELS[w] : t('hud.phaseWeather', { phase: DAY_PHASE_LABELS[phase], weather: WEATHER_LABELS[w] }));
  }

  refreshDebug(text: string) {
    const d = $('#debug');
    d.hidden = !this.game.state.settings.showDebug;
    if (!d.hidden) d.textContent = text;
  }

  /** Il pulsante del pipistrello: c'è solo in volo, coi secondi che restano. */
  refreshBatButton() {
    const b = document.getElementById('bat-toggle');
    if (!b) return;
    b.hidden = !this.game.isBat;
    b.querySelector('.bat-left')!.textContent = `${this.game.batSecondsLeft()}`;
  }

  refreshSettingsButtons() {
    this.refreshBatButton();
    // bicicletta: l'icona c'è solo se la si possiede; dorata quando il Custode è in sella
    const bike = $('#bike-toggle') as HTMLButtonElement;
    const riding = this.game.riding;
    bike.hidden = !this.game.ownsBike();
    bike.classList.toggle('active', riding);
    bike.setAttribute('aria-pressed', String(riding));
    bike.setAttribute('aria-label', riding ? t('hud.bike.dismount') : t('hud.bike.mount'));
    // scopa volante e bastone mistico: sopra la bici, solo se li si possiede
    const broom = $('#broom-toggle') as HTMLButtonElement, flying = this.game.flying;
    broom.hidden = !this.game.ownsBroom();
    broom.classList.toggle('active', flying);
    broom.setAttribute('aria-pressed', String(flying));
    broom.setAttribute('aria-label', flying ? t('hud.broom.dismount') : t('hud.broom.mount'));
    const staff = $('#staff-toggle') as HTMLButtonElement, held = this.game.staffOn;
    staff.hidden = !this.game.ownsStaff();
    staff.classList.toggle('active', held);
    staff.setAttribute('aria-pressed', String(held));
    staff.setAttribute('aria-label', held ? t('hud.staff.put') : t('hud.staff.take'));
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
        else { g.setEditMode(true); toast(t('hud.edit.toast')); }
        break;
      case 'inventory': S.openInventory(this); break;
      case 'shop': g.centerOnShop(); break;
      case 'photo': S.startPhoto(this); break;
      case 'gallery': S.openGallery(this); break;
      case 'settings': S.openSettings(this); break;
    }
  }

  openShop(cat?: Parameters<typeof S.openShop>[1], selected?: string | null) { S.openShop(this, cat, selected ?? null); }
  openRegistry() { H.openRegistry(this); }
  openHouse() { H.openHouse(this); }
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
    // interfaccia nuova: solo le azioni che ora si possono fare (niente icone spente)
    $('#ctx-actions').replaceChildren(...actions.filter((a) => !uiNext() || !a.disabled).map((a) => this.runButton(a)));
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
      sub = t('ctx.grave.sub', { type: GRAVE_TYPE_LABELS[g.graveType], state: GRAVE_STATE_LABELS[vs] });
      if (this.game.editMode) {
        actions.push({ act: 'detail', label: t('ctx.detail'), icon: 'search' });
        // in prova (bench) si riesuma solo dal dettaglio, col becchino
        if (!uiTrial()) actions.push({ act: 'exhume', label: t('ctx.exhume'), icon: 'shovel', cls: 'danger' });
        actions.push({ act: 'confirm', label: t('ctx.done'), icon: 'check', cls: 'primary' });
      } else {
        actions.push({ act: 'detail', label: t('ctx.detail'), icon: 'search' });
        // interfaccia nuova: «Affida all'albero» resta solo nel dettaglio della tomba
        if (!icons && s.placeables.some((p) => p.type === 'memory_tree')) actions.push({ act: 'entrust', label: t('ctx.entrust'), icon: 'tree' });
        if (g.broken) actions.push({ act: 'repair', label: t('ctx.repair'), icon: 'hammer', cls: 'primary', cost: R.graveRepairPrice(s) });
        else if (g.dirty || g.weeds) actions.push({ act: 'clean', label: t('ctx.clean'), icon: 'broom', cls: 'primary' });
        else actions.push({ act: 'flowers', label: g.hasFlowers ? t('ctx.flowersRenew') : t('ctx.flowers'), icon: 'flower', cls: 'primary' });
      }
    } else {
      const p = s.placeables.find((x) => x.id === sel.id);
      if (!p) { this.closeContext(); return; }
      const def = CATALOG[p.type];
      title = def.label;
      sub = p.broken ? t('ctx.state.broken') : p.dirty ? t('ctx.state.dirty') : def.light ? (p.lit ? t('ctx.state.lit') : t('ctx.state.off')) : def.category === 'npc' ? t('ctx.state.presence') : t('ctx.state.ok');
      if (this.game.editMode) {
        // anche in Modifica si vedono i dettagli (sentieri, aiuole & co. si toccano solo qui)
        if (icons) actions.push({ act: 'detail', label: t('ctx.detail'), icon: 'search' });
        if (def.rotatable) actions.push({ act: 'rotate', label: t('ctx.rotate'), icon: 'variant' });
        if (!def.permanent) actions.push({ act: 'store', label: t('ctx.store'), icon: 'bag', cls: 'danger' });
        actions.push({ act: 'confirm', label: t('ctx.done'), icon: 'check', cls: 'primary' });
      } else {
        if (p.type === 'shop') actions.push({ act: 'shop', label: t('ctx.shop'), icon: 'shop', cls: 'primary' });
        // casa del Custode: il registro e la personalizzazione; l'orto pronto si riscuote toccando
        if (p.type === 'keeper_house') {
          actions.push({ act: 'registry', label: t('ctx.registry'), icon: 'book', cls: 'primary' }, { act: 'house', label: t('ctx.house'), icon: 'house' });
          sub = t('ctx.registry.sub', { n: s.graves.length + s.entrusted.length });
        }
        if (p.type === 'memory_tree') { actions.push({ act: 'memories', label: t('ctx.memories'), icon: 'tree', cls: 'primary' }); sub = t('ctx.tree.sub', { n: s.entrusted.length }); }
        if (p.type === 'soul_bell' && !p.broken) {
          const ready = R.bellReady(s, p.id, this.game.now());
          if (ready) actions.push({ act: 'ring', label: t('ctx.bell.ring'), icon: 'bell', cls: 'primary' });
          sub = t('hud.join', { a: sub, b: ready ? t('ctx.bell.ready') : t('ctx.bell.rung') });
        }
        actions.push({ act: 'detail', label: t('ctx.detail'), icon: 'search' });
        if (p.broken) actions.push({ act: 'repair', label: t('ctx.repair'), icon: 'hammer', cls: 'primary', cost: R.placeableRepairPrice(s, p.type) });
        else if (p.dirty) actions.push({ act: 'clean', label: t('ctx.clean'), icon: 'broom' });
        if (def.light && !p.broken) actions.push({ act: 'light', label: p.lit ? t('ctx.light.off') : t('ctx.light.on'), icon: p.lit ? 'lightOff' : 'lightOn' });
        // la casetta porta anche il menù del suo animale (utile quando dorme in tana)
        if (isPetHouse(p.type)) { petActions = this.game.petMenu(p.id); sub = t('hud.join', { a: sub, b: this.game.petStatus(p.id) }); }
      }
    }
    this.ctxId = sel.id;
    $('#ctx-title').replaceChildren(document.createTextNode(title), h('small', {}, sub));
    $('#ctx-actions').replaceChildren(...actions.map((a) => icons
      // solo l'icona (il nome resta per i lettori di schermo); il costo in un angolino
      ? h('button', { class: a.cls ?? '', 'aria-label': a.cost ? t('ctx.costAria', { label: a.label, cost: a.cost }) : a.label, title: a.label, onclick: () => this.game.performEntityAction(sel.id, a.act) },
        icon(a.icon, 28), a.cost ? h('em', {}, String(a.cost)) : null)
      : h('button', {
        class: a.cls ?? '',
        onclick: () => this.game.performEntityAction(sel.id, a.act),
      }, icon(a.icon, 20), a.label, a.cost ? h('em', {}, ` −${a.cost}`, icon('wisp', 12)) : null)), ...petActions.filter((a) => !icons || !a.disabled).map((a) => this.runButton(a)));
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
    const tr = this.game.traceInfo();
    if (tr) {
      const def = CATALOG[p.type!];
      const hint = !tr.segs && !tr.ok && !tr.busy
        ? t('hud.trace.hint')
        : joinDot([t('hud.trace.ok', { n: tr.ok }), tr.short ? t('hud.trace.short', { n: tr.short }) : '', tr.busy ? t('hud.trace.busy', { n: tr.busy }) : '']);
      const bar = h('div', { class: 'tutorial trace-bar' },
        h('b', {}, icon(def.rotatable ? 'fence' : 'edit', 18), def.label, h('span', { class: 'trace-count' }, `${tr.ok}/${tr.have}`)),
        h('span', { class: tr.short ? 'muted warn' : 'muted' }, hint),
        tr.short ? h('button', { class: 'pill', onclick: () => this.game.buyTraceShortfall() }, t('hud.trace.buyShort', { n: tr.short, cost: tr.short * def.cost }), icon('wisp', 14)) : null,
        h('div', { class: 'row' },
          h('button', { class: 'pill exit', 'aria-label': t('hud.place.exit'), title: t('hud.place.exit'), onclick: () => this.game.cancelPlacement() }, icon('close', 18)),
          h('button', { class: 'pill', disabled: !tr.segs, onclick: () => this.game.undoTrace() }, t('hud.trace.undo')),
          h('button', { class: 'pill primary', disabled: !tr.ok, onclick: () => this.game.confirmPlacement() }, t('hud.place.confirm')),
        ),
      );
      if (this.placementBar) this.placementBar.replaceWith(bar); else $('#game').append(bar);
      this.placementBar = bar;
      return;
    }
    const label = p.kind === 'grave' ? t('hud.place.graveTitle', { name: p.draft!.name }) : CATALOG[p.type!].label;
    const rot = p.kind === 'item' && CATALOG[p.type!].rotatable;
    const bar = h('div', { class: 'tutorial' },
      h('b', {}, icon(p.kind === 'grave' ? 'bury' : 'target', 18), label),
      h('span', { class: 'muted' }, p.valid ? t('hud.place.hint') : t('hud.place.busy')),
      h('div', { class: 'row' },
        h('button', { class: 'pill', onclick: () => this.game.cancelPlacement() }, t('dialog.cancel')),
        rot ? h('button', { class: 'pill', onclick: () => this.game.rotatePlacement() }, icon('variant', 16), t('hud.place.rotate')) : null,
        h('button', { class: 'pill primary', disabled: !p.valid, onclick: () => this.game.confirmPlacement() }, p.kind === 'grave' ? t('hud.place.bury') : t('hud.place.confirm')),
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
        h('b', {}, t('hud.tutorial.title')),
        h('span', {}, t('hud.tutorial.shop')),
        h('span', { class: 'muted' }, t('hud.tutorial.graves')),
        h('button', { class: 'big-btn', onclick: () => { s.shopTutorialDone = true; card.remove(); this.tutorial = null; this.game.recenter(); this.game.afterChange(); } }, t('hud.tutorial.ok')),
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
