import { Game } from './app/Game.ts';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jacquard-24/400.css';
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
import { setUiNext, setUiPlay, setUiPreview } from './app/uiNext.ts';
import { bootScreen, nextPaint, runSliced } from './app/boot.ts';
import { loadSave, takeRecoveredNotice } from './app/persistence.ts';
import { toast } from './ui/dom.ts';
import { warmAllPreviews } from './ui/screens.ts';
import { modelJobs } from './view/WorldView.ts';
import { warmHeroes } from './ui/heroWarm.ts';
import { restoreThumbs, warmThumbs } from './ui/thumbWarm.ts';
import { installPlayDecor } from './ui/playDecor.ts';
import { t } from './i18n/index.ts';
import { simulateAccess } from './game/entitlement.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) throw new Error('Canvas di gioco non trovato.'); // i18n-ok: errore interno, la pagina ha sempre il canvas

// interfaccia nuova (stile low-poly, temi, menù a icone, strumento a traccia, Bottega animata)
setUiNext(true);
// interfaccia «viva» (tema marrone, pattern, menù a riquadri, angoli dei recinti, Custode fuori dal riquadro)
setUiPlay(true);
// casa del Custode (registro, personalizzazione, vantaggi), requisiti di sblocco in Bottega, morso del vampiro
setUiPreview(true);
installPlayDecor();
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
    // i modelli del cimitero salvato, a pezzi, con la barra che avanza
    boot.stage('boot.step.stones', 0.16);
    const save = loadSave();
    if (save) await runSliced(modelJobs(save, 'lowpoly'), (k) => boot.progress(0.16 + k * 0.44));
    // il terreno, il bosco, il sottobosco e tutto il resto: un blocco unico
    boot.stage('boot.step.ground', 0.62);
    await nextPaint();
    const game = new Game(canvas, { state: save ?? undefined });
    (window as unknown as { necro: Game }).necro = game;
    // luci e shader: il primo disegno, poi via la schermata
    boot.stage('boot.step.lanterns', 0.92);
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
    await boot.finish(first ? { cta: t('onboarding.enter') } : undefined);
    if (first || game.state.onboarding.stage !== 'done') setTimeout(warmAllPreviews, 300);
    game.ui.onboarding.resume();
    // il salvataggio non si leggeva: una copia è rimasta da parte (persistence.ts), lo si dice
    if (takeRecoveredNotice()) toast(t('save.recovered'));
  } catch (error) {
    console.error('Impossibile inizializzare la scena 3D:', error);
    document.getElementById('boot')?.remove();
    const el = document.querySelector<HTMLElement>('#fatal');
    if (el) { el.hidden = false; el.textContent = t('boot.webglFailed'); }
  }
})();
