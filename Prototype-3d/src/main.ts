import { Game } from './app/Game.ts';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jacquard-24/400.css';
import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles/main.css';
import './styles/ui-next.css';
import './styles/ui-play.css';
import './styles/ui-house.css';
import { setUiNext, setUiPlay, setUiPreview } from './app/uiNext.ts';
import { warmHeroes } from './ui/heroWarm.ts';
import { installPlayDecor } from './ui/playDecor.ts';
import { t } from './i18n/index.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) throw new Error('Canvas di gioco non trovato.'); // i18n-ok: errore interno, la pagina ha sempre il canvas

// interfaccia nuova (stile low-poly, temi, menù a icone, strumento a traccia, Bottega animata)
setUiNext(true);
// interfaccia «viva» (tema marrone, pattern, menù a riquadri, angoli dei recinti, Custode fuori dal riquadro)
setUiPlay(true);
// casa del Custode (registro, personalizzazione, vantaggi), requisiti di sblocco in Bottega, morso del vampiro
setUiPreview(true);
installPlayDecor();

try {
  const game = new Game(canvas);
  (window as unknown as { necro: Game }).necro = game;
  game.start();
  // le testate animate (albero, casa) si preparano nei momenti liberi
  warmHeroes(game.state);
} catch (error) {
  console.error('Impossibile inizializzare la scena 3D:', error);
  const el = document.querySelector<HTMLElement>('#fatal');
  if (el) { el.hidden = false; el.textContent = t('boot.webglFailed'); }
}
