import { Game } from './app/Game.ts';
import '@fontsource/cinzel/700.css';
import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles/main.css';
import './styles/ui-next.css';
import './styles/ui-play.css';
import './styles/ui-house.css';
import './styles/ui-onboarding.css';
import './styles/ui-moments.css';
import { bootScreen, nextPaint, runSliced } from './app/boot.ts';
import { loadSave, takeRecoveredNotice } from './app/persistence.ts';
import { toast } from './ui/dom.ts';
import { warmAllPreviews } from './ui/screens.ts';
import { modelJobs } from './view/WorldView.ts';
import { hydrateModelCache, persistModelCache } from './render/modelCache.ts';
import { flushVegetationCache, hydrateVegetationCache } from './view/vegetationCache.ts';
import { buildYard } from './game/yard.ts';
import { createNewGame } from './game/state.ts';
import { warmHeroes } from './ui/heroWarm.ts';
import { restoreThumbs, warmThumbs } from './ui/thumbWarm.ts';
import { installPlayDecor } from './ui/playDecor.ts';
import { currentLang, NATIVE_LANG_NAMES, t } from './i18n/index.ts';
import { simulateAccess } from './game/entitlement.ts';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { distribution } from './config/distribution.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) throw new Error('Canvas di gioco non trovato.'); // i18n-ok: errore interno, la pagina ha sempre il canvas

installPlayDecor();
if (Capacitor.isNativePlatform()) {
  // Contenuto chiaro sullo sfondo scuro del gioco: Style.Dark in Capacitor
  // mostra in bianco ora, segnale, Wi-Fi e batteria.
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  if (Capacitor.getPlatform() === 'android') {
    void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
  } else {
    void StatusBar.setBackgroundColor({ color: '#17131e' }).catch(() => undefined);
  }
}
// ?access=demo (o full) simula l'accesso commerciale: solo nel profilo development, altrove è ignorato
const simulated = new URLSearchParams(location.search).get('access');
if (simulated === 'demo' || simulated === 'full') simulateAccess(simulated);

const boot = bootScreen();
void (async () => {
  try {
    await nextPaint();
    boot.stage('boot.step.gate', 0.08);
    // i caratteri (il titolo gotico) e le miniature salvate nell'avvio precedente
    await Promise.all([Promise.race([document.fonts?.load('700 20px Cinzel').then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 1200))]), restoreThumbs()]);
    boot.showTagline();
    // Ripristina prima i modelli low-poly generati in un avvio precedente.
    boot.stage('boot.step.stones', 0.12);
    await Promise.all([
      hydrateModelCache((p) => boot.progress(0.12 + p * 0.02)),
      hydrateVegetationCache((p) => boot.progress(0.14 + p * 0.02)),
    ]);
    // Prepara sia il cimitero reale sia il cortile del tutorial: al risveglio
    // i modelli non devono essere generati nel mezzo della transizione.
    boot.stage('boot.step.stones', 0.16);
    const save = loadSave();
    const params = new URLSearchParams(location.search);
    const urlSeed = Number(params.get('seed'));
    const initialState = save ?? createNewGame(new Date(), Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : undefined);
    const needsTutorial = initialState.onboarding.stage !== 'done';
    const yardState = needsTutorial ? buildYard(initialState, new Date(), initialState.onboarding) : null;
    const jobs = [...modelJobs(initialState), ...(yardState ? modelJobs(yardState, false) : [])];
    await runSliced(jobs, (k) => boot.progress(0.16 + k * 0.35));
    boot.stage('boot.step.stones', 0.51);
    await persistModelCache((p) => boot.progress(0.51 + p * 0.11));
    // Costruisce il mondo a fasi, lasciando allo splash un frame tra i lavori.
    boot.stage('boot.step.ground', 0.62);
    await nextPaint();
    const game = new Game(canvas, { state: initialState, deferInitialScene: true });
    await game.prepareInitialScene((p) => boot.progress(0.62 + p * 0.16));
    // Il cortile e il cimitero restano due scene distinte: prepariamo il
    // tutorial sotto lo splash e poi lo scambio al risveglio è immediato.
    if (yardState) await game.prepareTutorialWorld(buildYard(game.state, new Date(), game.state.onboarding), (p) => boot.progress(0.78 + p * 0.12));
    else boot.progress(0.90);
    await flushVegetationCache();
    if (distribution().id === 'development') (window as unknown as { necro: Game }).necro = game;
    // luci e shader: il primo disegno, poi via la schermata
    boot.stage('boot.step.lanterns', 0.90);
    await nextPaint();
    game.prepareLoadingShaders();
    boot.progress(0.92);
    await nextPaint();
    game.start();
    await nextPaint();
    // nei momenti liberi (anche mentre si legge la pergamena e si sceglie il nome): le testate
    // animate (albero, casa), le miniature che mancano, le anteprime della Bottega
    warmHeroes(game.state);
    warmThumbs(game.state);
    // primo ingresso (o partita nuova): il pulsante sulla schermata iniziale, poi la pergamena;
    // altrimenti la schermata sfuma e si gioca (o si riprende il percorso da dove era rimasto)
    const first = game.state.onboarding.stage === 'welcome';
    // le fasi a schermo pieno hanno il loro sfondo già sotto lo splash: la scena non si intravede
    game.ui.onboarding.cover();
    await boot.finish(first ? { cta: t('onboarding.enter') } : undefined);
    game.finishLoading();
    if (Capacitor.isNativePlatform()) await SplashScreen.hide().catch(() => undefined);
    if (first || game.state.onboarding.stage !== 'done') setTimeout(warmAllPreviews, 300);
    game.ui.onboarding.resume();
    try {
      if (sessionStorage.getItem('necro.afterLang') && game.state.onboarding.stage === 'done') {
        sessionStorage.removeItem('necro.afterLang');
        game.ui.openSettings();
        toast(t('settings.language.changed', { name: NATIVE_LANG_NAMES[currentLang()] }));
      }
    } catch { /* storage di sessione non disponibile */ }
    // il salvataggio non si leggeva: una copia è rimasta da parte (persistence.ts), lo si dice
    if (takeRecoveredNotice()) toast(t('save.recovered'));
  } catch (error) {
    console.error('Impossibile inizializzare la scena 3D:', error);
    if (Capacitor.isNativePlatform()) await SplashScreen.hide().catch(() => undefined);
    document.getElementById('boot')?.remove();
    const el = document.querySelector<HTMLElement>('#fatal');
    if (el) { el.hidden = false; el.textContent = t('boot.webglFailed'); }
  }
})();
