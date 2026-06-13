import './style.css'
import { Application } from 'pixi.js';

// Create a PixiJS application.
const app = new Application();

// Asynchronous IIFE
(async () => {
  // Intialize the application.
  await app.init({ background: '#1b6eeb', resizeTo: window });

  // Then adding the application's canvas to the DOM.
  document.querySelector<HTMLDivElement>('#app')?.appendChild(app.canvas);
})();
