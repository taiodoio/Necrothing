import { createGameState } from './core/GameState.ts';
import { Game } from './core/Game.ts';
import './styles/main.css';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) throw new Error('Canvas di gioco non trovato.');

try {
  const game = new Game(canvas, createGameState(717)); game.start();
  window.addEventListener('pagehide', () => game.dispose(), { once: true });
} catch (error) {
  console.error('Impossibile inizializzare la scena 3D:', error);
  const toast = document.querySelector<HTMLElement>('#toast');
  if (toast) { toast.textContent = 'La scena non è riuscita ad aprirsi in questo browser.'; toast.classList.add('visible'); }
}
