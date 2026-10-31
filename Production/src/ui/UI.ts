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
import { $, applyPageTexts, closeDrawer, drawerOpen, h, joinDot } from './dom.ts';
import { Onboarding } from './onboarding.ts';
import { hydrateIcons, icon, iconUrl } from './icons.ts';
import { monoIcon } from './monoIcons.ts';
import { openDeceased } from './deceased.ts';
import { custodePortrait } from './lookThumbs.ts';
import { shortWisps } from './numbers.ts';
import * as S from './screens.ts';
import * as H from './house.ts';
import * as T from './memoryTree.ts';

/** Icona del pulsante del menù di gioco: la pala, o le tre righe con l'interfaccia nuova. */
const fabIcon = () => 'menu';

const WEATHER_LABELS = { clear: t('hud.weather.clear'), fog: t('hud.weather.fog'), rain: t('hud.weather.rain'), storm: t('hud.weather.storm') } as const;
const PHASE_ICONS = { dawn: 'dawn', day: 'sun', dusk: 'dusk', night: 'moon' } as const;
const WEATHER_ICONS = { clear: '', fog: 'fog', rain: 'rain', storm: 'rain' } as const;

export class UI {
  readonly game: Game;
  private ctxId: string | null = null;
  /** Menù ancorato a un personaggio (animale, Custode) invece che a un oggetto. */
  private ctxAnchor: (() => THREE.Vector3 | null) | null = null;
  private placementBar: HTMLElement | null = null;
  /** Il primo ingresso: pergamena, nome, introduzione, tutorial, giro dell'interfaccia (ui/onboarding.ts). */
  readonly onboarding: Onboarding;

  constructor(game: Game) {
    this.game = game;
    this.onboarding = new Onboarding(this);
    applyPageTexts();
    // Il rango è il numerino sul ritratto; le Impostazioni sono l'ultima voce del menù.
    const row = h('div', { class: 'xp-row' });
    $('.chip-body .xp-bar').before(row);
    row.append($('.chip-body .xp-bar'), $('.wisp-count'));
    $('#player-chip').append(h('span', { class: 'rank-badge', id: 'hud-rank-badge', 'aria-hidden': 'true' }));
    $('#settings-btn').remove();
    $('#slots').append(h('button', { class: 'slot', 'data-act': 'settings' }, h('i', { 'data-icon': 'gear' }), h('small', {}, t('menu.settings'))));
    $('#fab').after(h('button', { class: 'fab bury-fab', id: 'bury-fab', 'aria-label': t('menu.bury'), onclick: () => { this.closeBubble(); this.bubbleAction('bury'); } }, h('i', { 'data-icon': 'bury' })));
    hydrateIcons();
    $('#fab-icon').style.backgroundImage = iconUrl(fabIcon());
    $('#fab').setAttribute('aria-label', t('menu.fab.aria'));
    $('#edit-banner span').textContent = t('hud.edit.banner');
    $('#edit-done').classList.add('primary');
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
    const bat = h('button', { class: 'icon-btn bat-btn', id: 'bat-toggle', 'aria-label': t('hud.bat.aria'), hidden: true, onclick: () => game.endBat() }, icon('bat', 26), h('em', { class: 'bat-left' }, ''));
    $('#staff-toggle').before(bat);
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
    const url = custodePortrait(p.look, true);
    const box = $('.chip-avatar');
    if (url && box.dataset.src !== url) { box.dataset.src = url; box.replaceChildren(h('img', { src: url, alt: '' })); }
    $('#hud-wisps').textContent = shortWisps(p.wisps);
    $('.wisp-count').setAttribute('aria-label', t('hud.wispsAria', { n: p.wisps.toLocaleString(currentLang()) }));
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
    const label = t('hud.phaseWeather', { phase: DAY_PHASE_LABELS[phase], weather: WEATHER_LABELS[w] });
    el.replaceChildren(icon(`sky-${phase}-${w}`, 24));
    el.setAttribute('aria-label', label);
    el.title = label;
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
        // il banner di Modifica dice già cosa fare: niente toast
        else g.setEditMode(true);
        break;
      case 'inventory': S.openInventory(this); break;
      case 'shop': g.centerOnShop(); break;
      case 'photo': S.startPhoto(this); break;
      case 'gallery': S.openGallery(this); break;
      case 'settings': S.openSettings(this); break;
    }
  }

  openShop(cat?: Parameters<typeof S.openShop>[1], selected?: string | null) { S.openShop(this, cat, selected ?? null); }
  openSettings() { S.openSettings(this); }
  openRegistry() { H.openRegistry(this); }
  openHouse() { H.openHouse(this); }
  openDetail(id: string) { S.openDetail(this, id); }
  /** La scheda della tomba aperta da una notifica (fantasma con nome, anniversario). */
  openGrave(id: string) { openDeceased(this, id, { from: 'note' }); }
  openEntrust(graveId: string) { T.openEntrust(this, graveId); }
  openMemoryTree() { T.openMemoryTree(this); }
  openMemory(id: string, visit?: R.ActionResult) { T.openMemory(this, id, visit); }
  reopenBurial(draft: BurialDraft) { S.openBurial(this, draft, 5); }

  refreshEditBanner() {
    $('#edit-banner').hidden = true;
    this.refreshPlacementBar();
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
      $('#ctx-actions').replaceChildren(...actions.filter((a) => !a.disabled).map((a) => this.runButton(a)));
    $('#ctx').hidden = false;
    this.positionContext();
  }

  private runButton(a: { label: string; icon: string; cls?: string; disabled?: boolean; run: () => void }) {
    const run = () => { this.closeContext(); this.game.select(null); a.run(); };
    return h('button', { class: a.cls ?? '', disabled: !!a.disabled, 'aria-label': a.label, title: a.label, onclick: run }, icon(a.icon, 28));
  }

  /**
   * Le azioni di un oggetto fuori da Modifica (le stesse nel menù sulla mappa
   * e nella sua scheda), con il sottotitolo che le accompagna partendo da `sub`.
   */
  placeableActions(id: string, sub = '') {
    const s = this.game.state;
    const p = s.placeables.find((x) => x.id === id);
    const actions: Array<{ act: EntityAction; label: string; icon: string; cls?: string; cost?: number }> = [];
    let pet: ReturnType<Game['petMenu']> = [];
    if (!p) return { actions, pet, sub };
    const def = CATALOG[p.type];
    // bar, orto, angolo della strega, casa con l'orto: l'incasso pronto prima di tutto
    const pending = R.businessPending(s, p.id, this.game.now());
    if (pending > 0) actions.push({ act: 'collect', label: t('ctx.collect', { n: pending }), icon: 'wisp', cls: 'primary' });
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
    if (isPetHouse(p.type)) { pet = this.game.petMenu(p.id); sub = t('hud.join', { a: sub, b: this.game.petStatus(p.id) }); }
    return { actions, pet, sub };
  }

  refreshContext() {
    const sel = this.game.selection;
    if (!sel && this.ctxAnchor) return; // resta aperto il menù del personaggio
    if (!sel || (this.game.placement && !this.game.placement.trace) || drawerOpen()) { this.closeContext(); return; }
    // interfaccia nuova: l'oggetto è evidenziato, il menù aspetta che il Custode ci arrivi
    if (!this.game.editMode && !this.game.placement?.trace && !this.game.ctxReady) { this.closeContext(); return; }
    const icons = true;
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
      if (this.game.editMode || this.game.placement?.trace) {
        // si riesuma solo dal dettaglio (col becchino e la carriola), non dal menù
        actions.push({ act: 'detail', label: t('ctx.detail'), icon: 'search' });
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
      if (this.game.editMode || this.game.placement?.trace) {
        // anche in Modifica si vedono i dettagli (sentieri, aiuole & co. si toccano solo qui)
        if (icons) actions.push({ act: 'detail', label: t('ctx.detail'), icon: 'search' });
      } else {
        const own = this.placeableActions(p.id, sub);
        actions.push(...own.actions);
        petActions = own.pet;
        sub = own.sub;
      }
    }
    this.ctxId = sel.id;
    $('#ctx-title').replaceChildren(document.createTextNode(title), h('small', {}, sub));
    $('#ctx-actions').replaceChildren(...actions.map((a) => icons
      // solo l'icona (il nome resta per i lettori di schermo); il costo in un angolino
      ? h('button', { class: a.cls ?? '', 'data-ctx': a.act, 'aria-label': a.cost ? t('ctx.costAria', { label: a.label, cost: a.cost }) : a.label, title: a.label, onclick: () => this.game.performEntityAction(sel.id, a.act) },
        icon(a.icon, 28), a.cost ? h('em', {}, icon('wisp', 11), String(a.cost)) : null)
      : h('button', {
        class: a.cls ?? '',
        'data-ctx': a.act,
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
    if (!p || p.x < 0 || p.x > window.innerWidth || p.y < 0 || p.y > window.innerHeight) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    const w = el.offsetWidth || 200;
    const x = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, p.x));
    const y = Math.max(el.offsetHeight + 74, Math.min(window.innerHeight - 90, p.y - 6));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  // ── Posizionamento ───────────────────────────────────────────────────

  private toolGuide(trace: boolean): HTMLElement {
    const key = trace ? 'hud.tools.drawGuide' : 'hud.tools.moveGuide';
    const name = trace ? 'toolPencil' : 'toolMove';
    const guide = h('span', { class: 'muted tool-guide', role: 'img', 'aria-label': t(key, { hand: t('hud.tools.pan'), tool: t(trace ? 'hud.tools.draw' : 'hud.tools.move') }) });
    for (const part of t(key).split(/(\{hand\}|\{tool\})/g)) {
      guide.append(part === '{hand}' ? monoIcon('toolHand', 16) : part === '{tool}' ? monoIcon(name, 16) : document.createTextNode(part));
    }
    return guide;
  }

  private toolButtons(trace: boolean, canConfirm: boolean, placingItem = false): HTMLElement {
    const game = this.game;
    const button = (label: string, iconName: string, onClick: () => void, opts: { selected?: boolean; disabled?: boolean; primary?: boolean; tool?: string } = {}) =>
      h('button', { type: 'button', class: `pill tool-btn${opts.selected ? ' selected' : ''}${opts.primary ? ' primary' : ''}`,
        'aria-label': label, title: label, 'data-tool': opts.tool, 'aria-pressed': opts.selected === undefined ? undefined : String(opts.selected),
        disabled: opts.disabled, onclick: onClick }, icon(iconName, 32));
    const workLabel = t(trace ? 'hud.tools.draw' : 'hud.tools.move');
    return h('div', { class: 'tool-actions' },
      h('div', { class: 'tool-toggle', role: 'group', 'aria-label': joinDot([t('hud.tools.pan'), workLabel]) },
        button(t('hud.tools.pan'), 'toolHand', () => game.setToolMode('pan'), { selected: game.toolMode === 'pan', tool: 'pan' }),
        button(workLabel, trace ? 'edit' : 'toolMove', () => game.setToolMode('work'), { selected: game.toolMode === 'work', tool: 'work' })),
      button(t('hud.tools.undo'), 'undo', () => game.undoTool(), { disabled: !game.canUndoTool(), tool: 'undo' }),
      button(t('hud.place.confirm'), 'check', () => trace || placingItem ? game.confirmPlacement() : game.setEditMode(false), { primary: true, disabled: !canConfirm, tool: 'confirm' }),
    );
  }

  refreshPlacementBar() {
    const p = this.game.placement;
    const editing = this.game.editMode && !p;
    // mentre si sceglie il posto spariscono il menù e i pulsanti della mappa: la barra scende in fondo, al loro posto
    $('#game').classList.toggle('tools-off', !!p || editing);
    if (!p && !editing) { this.placementBar?.remove(); this.placementBar = null; if (!this.game.shrink) $('#bubble').classList.remove('hidden'); return; }
    $('#bubble').classList.add('hidden');
    if (editing) {
      const bar = h('div', { class: 'tutorial tool-bar' },
        h('div', { class: 'tool-head' },
          h('b', {}, t('menu.edit')),
          h('button', { class: 'pill exit', 'aria-label': t('hud.place.exit'), title: t('hud.place.exit'), onclick: () => this.game.setEditMode(false) }, icon('close', 18))),
        this.toolGuide(false),
        this.toolButtons(false, true));
      if (this.placementBar) this.placementBar.replaceWith(bar); else $('#game').append(bar);
      this.placementBar = bar;
      return;
    }
    if (!p) return;
    const tr = this.game.traceInfo();
    if (tr) {
      const def = CATALOG[p.type!];
      const status = !tr.segs && !tr.ok && !tr.busy ? '' : joinDot([t('hud.trace.ok', { n: tr.ok }), tr.short ? t('hud.trace.short', { n: tr.short }) : '', tr.busy ? (tr.blockers.length ? t('hud.trace.busyBy', { n: tr.busy, what: tr.blockers.slice(0, 3).join(', ') }) : t('hud.trace.busy', { n: tr.busy })) : '']);
      const bar = h('div', { class: 'tutorial trace-bar tool-bar' },
        h('div', { class: 'tool-head' },
          h('b', {}, icon('edit', 18), def.label, h('span', { class: 'trace-count' }, `${tr.ok}/${tr.have}`)),
          h('button', { class: 'pill exit', 'aria-label': t('hud.place.exit'), title: t('hud.place.exit'), onclick: () => this.game.cancelPlacement() }, icon('close', 18))),
        this.toolGuide(true),
        status ? h('span', { class: tr.short || tr.busy ? 'muted warn' : 'muted' }, status) : null,
        tr.short ? h('button', { class: 'pill', onclick: () => this.game.buyTraceShortfall() }, t('hud.trace.buyShort', { n: tr.short, cost: tr.short * def.cost }), icon('wisp', 14)) : null,
        this.toolButtons(true, !!tr.ok),
      );
      if (this.placementBar) this.placementBar.replaceWith(bar); else $('#game').append(bar);
      this.placementBar = bar;
      return;
    }
    if (p.kind === 'item') {
      this.closeContext();
      const def = CATALOG[p.type!];
      const blockers = this.game.placementBlockers();
      const bar = h('div', { class: 'tutorial tool-bar' },
        h('div', { class: 'tool-head' },
          h('b', {}, icon('edit', 18), def.label),
          def.rotatable ? h('button', { class: 'pill rotate', 'data-tool': 'rotate', 'aria-label': t('hud.place.rotate'), title: t('hud.place.rotate'), onclick: () => this.game.rotatePlacement() }, icon('variant', 18)) : null,
          h('button', { class: 'pill exit', 'aria-label': t('hud.place.exit'), title: t('hud.place.exit'), onclick: () => this.game.cancelPlacement() }, icon('close', 18))),
        this.toolGuide(false),
        !p.valid ? h('span', { class: 'muted warn' }, blockers.length ? t('hud.place.busyBy', { what: blockers.slice(0, 3).join(', ') }) : t('hud.place.busy')) : null,
        this.toolButtons(false, p.valid, true));
      if (this.placementBar) this.placementBar.replaceWith(bar); else $('#game').append(bar);
      this.placementBar = bar;
      return;
    }
    this.closeContext();
    const label = t('hud.place.graveTitle', { name: p.draft!.name });
    const blockers = this.game.placementBlockers();
    const bar = h('div', { class: 'tutorial' },
      h('b', {}, icon('bury', 18), label),
      h('span', { class: 'muted' }, p.valid ? t('hud.place.hint') : blockers.length ? t('hud.place.busyBy', { what: blockers.slice(0, 3).join(', ') }) : t('hud.place.busy')),
      h('div', { class: 'row' },
        h('button', { class: 'pill', onclick: () => this.game.cancelPlacement() }, t('dialog.cancel')),
        h('button', { class: 'pill primary', disabled: !p.valid, onclick: () => this.game.confirmPlacement() }, t('hud.place.bury')),
      ),
    );
    if (this.placementBar) this.placementBar.replaceWith(bar); else $('#game').append(bar);
    this.placementBar = bar;
  }

  /** Chiamato ogni frame: riposiziona il menù contestuale. */
  frame() {
    if ((this.ctxId || this.ctxAnchor) && !$('#ctx').hidden) this.positionContext();
    this.onboarding.frame();
  }
}
