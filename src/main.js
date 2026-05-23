import './styles.css';
import { Game } from './core/Game.js';

const canvas = document.getElementById('game-canvas');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');

const game = new Game(canvas);

startButton.addEventListener('click', () => {
  startScreen.classList.add('is-hidden');
  game.start();
});

window.__BONEPILE_GAME__ = game;
