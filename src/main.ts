import './style.css'
import { Application } from 'pixi.js';
import { Game } from './Game';

const app = new Application();

(async () => {
  await document.fonts.load('400 24px "Unitblock"');
  await document.fonts.load('400 24px "GlacialIndifference"');
  await document.fonts.ready;

  await app.init({
    background: '#071421',
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
  });

  document.querySelector<HTMLDivElement>('#app')?.appendChild(app.canvas);

  const game = new Game(app);
  game.start();
})();
