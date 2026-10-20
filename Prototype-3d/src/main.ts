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
import { setUiNext, setUiPlay } from './app/uiNext.ts';
import { installPlayDecor } from './ui/playDecor.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) throw new Error('Canvas di gioco non trovato.');

// interfaccia nuova (stile low-poly, temi, menù a icone, strumento a traccia, Bottega animata)
setUiNext(true);
// interfaccia «viva» (tema marrone, pattern, menù a riquadri, angoli dei recinti, Custode fuori dal riquadro)
setUiPlay(true);
installPlayDecor();

try {
  const game = new Game(canvas);
  (window as unknown as { necro: Game }).necro = game;
  game.start();
} catch (error) {
  console.error('Impossibile inizializzare la scena 3D:', error);
  const el = document.querySelector<HTMLElement>('#fatal');
  if (el) { el.hidden = false; el.textContent = 'La scena 3D non si è aperta in questo browser (WebGL non disponibile?).'; }
}
