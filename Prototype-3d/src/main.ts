import { Game } from './app/Game.ts';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jacquard-24/400.css';
import './styles/main.css';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) throw new Error('Canvas di gioco non trovato.');

try {
  const game = new Game(canvas);
  (window as unknown as { necro: Game }).necro = game;
  game.start();
} catch (error) {
  console.error('Impossibile inizializzare la scena 3D:', error);
  const el = document.querySelector<HTMLElement>('#fatal');
  if (el) { el.hidden = false; el.textContent = 'La scena 3D non si è aperta in questo browser (WebGL non disponibile?).'; }
}
