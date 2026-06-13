import {
  Application,
  BitmapText,
  Container,
  Graphics,
  Rectangle,
  Text,
  type FederatedPointerEvent,
  type Ticker,
} from 'pixi.js';
import { LEVEL_QUESTIONS } from './questions';
import { renderMathText } from './mathText';
import { SoundSystem } from './SoundSystem';
import { createInitialWeapons } from './weapons';
import { EffectsSystem } from './EffectsSystem';
import type { Enemy, Explosion, Projectile, Question, Upgrade, Weapon, WeaponKind } from './types';

type QuestionButton = Container & {
  answerText: string;
  labelLayer: Container;
};

const DefaultFont = "Unitblock"
const DefaultMeterFont = "Zekton"
const DetailTextFont = "GlacialIndifference"
// math font is in src/mathText.ts

export class Game {
  private readonly app: Application;
  private readonly scene = new Container();
  private readonly world = new Container();
  private readonly effectsLayer = new Container();
  private readonly ui = new Container();
  private readonly overlay = new Container();
  private readonly background = new Graphics();
  private readonly machine = new Container();
  private readonly machineArt = new Graphics();
  private readonly sounds = new SoundSystem();
  private readonly effects = new EffectsSystem(this.effectsLayer);
  private readonly comboBar = new Graphics();
  private readonly upgradeBar = new Graphics();
  private readonly healthBar = new Graphics();
  private readonly enemyBar = new Graphics();
  private readonly settingsButton = new Container();
  private readonly settingsButtonBg = new Graphics();
  private readonly settingsButtonIcon = new Graphics();
  private readonly debugUpgradeButton = new Container();
  private readonly debugUpgradeButtonBg = new Graphics();
  private readonly debugUpgradeButtonText = new Text({
    text: 'UPGRADE',
    style: { fontFamily: DefaultFont, fontSize: 14, fill: 0xb7f9ff, fontWeight: '700', letterSpacing: 1 },
  });
  private readonly questionText = new Text({
    text: '',
    style: {
      fontFamily: DefaultFont,
      fontSize: 24,
      fill: 0x7ff7ff,
      fontWeight: '700',
      letterSpacing: 1.5,
      dropShadow: { color: 0x0b2640, blur: 3, distance: 2 },
    },
  });
  private readonly statusText = new BitmapText({
    text: '',
    style: { fontFamily: DefaultFont, fontSize: 17, fill: 0xb7f9ff },
  });
  private readonly upgradeMeterText = new Text({
    text: 'Upgrade Meter',
    style: { fontFamily: DefaultMeterFont, fontSize: 18, fill: 0xb7f9ff, fontWeight: '700', letterSpacing: 1 },
  });
  private readonly comboMeterText = new Text({
    text: 'Combo Meter!',
    style: {
      fontFamily: DefaultMeterFont,
      fontSize: 20,
      fill: 0xffffff,
      fontWeight: '700',
      letterSpacing: 1.5,
      dropShadow: { color: 0x020617, blur: 3, distance: 1 },
    },
  });

  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private explosions: Explosion[] = [];
  private questionButtons: QuestionButton[] = [];
  private weapons: Weapon[] = [];
  private readonly maxMachineHp = 100;
  private machineHp = 100;
  private totalEnemies = 24;
  private spawnedEnemies = 0;
  private destroyedEnemies = 0;
  private stage = 1;
  private waveMode: 'regular' | 'boss' = 'regular';
  private upgradeCounter = 0;
  private correctSinceUpgrade = 0;
  private combo = 0;
  private maxCombo = 3;
  private currentQuestionIndex = 0;
  private spawnTimerMs = 0;
  private frenzyTimerMs = 0;
  private wasFrenzyActive = false;
  private paused = false;
  private layout = {
    width: 1,
    height: 1,
    playX: 70,
    playY: 18,
    playW: 1,
    playH: 1,
    controlsY: 1,
    machineX: 1,
    machineY: 1,
  };

  public constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.scene.addChild(this.background, this.world, this.effectsLayer, this.ui, this.overlay);
    this.world.addChild(this.machine);
    this.machine.addChild(this.machineArt);
    this.settingsButton.addChild(this.settingsButtonBg, this.settingsButtonIcon);
    this.settingsButton.eventMode = 'static';
    this.settingsButton.cursor = 'pointer';
    this.settingsButton.on('pointertap', () => this.openSettingsDialog());
    this.debugUpgradeButton.addChild(this.debugUpgradeButtonBg, this.debugUpgradeButtonText);
    this.debugUpgradeButton.eventMode = 'static';
    this.debugUpgradeButton.cursor = 'pointer';
    this.debugUpgradeButton.on('pointertap', () => {
      this.sounds.unlock();
      this.openUpgradeDialog();
    });
    this.ui.addChild(
      this.comboBar,
      this.upgradeBar,
      this.healthBar,
      this.enemyBar,
      this.questionText,
      this.statusText,
      this.upgradeMeterText,
      this.comboMeterText,
      this.debugUpgradeButton,
      this.settingsButton,
    );
    this.app.stage.addChild(this.scene);

    this.weapons = createInitialWeapons();
    this.weapons.forEach((weapon) => this.machine.addChild(weapon.turret));
    this.layoutScene();
    this.showQuestion();


    window.addEventListener('resize', () => this.layoutScene());
    this.app.ticker.add((ticker) => this.update(ticker));
  }

  private get activeQuestions(): Question[] {
    return LEVEL_QUESTIONS[(this.stage - 1) % LEVEL_QUESTIONS.length].questions;
  }

  private update(ticker: Ticker): void {
    if (this.paused) {
      return;
    }

    const dt = ticker.deltaMS;
    this.spawnTimerMs -= dt;
    this.frenzyTimerMs = Math.max(0, this.frenzyTimerMs - dt);
    this.machineHp = Math.min(this.maxMachineHp, this.machineHp + (3 / 1000) * dt);

    if (this.waveMode === 'regular' && this.spawnTimerMs <= 0 && this.spawnedEnemies < this.totalEnemies) {
      this.spawnEnemy();
      this.spawnTimerMs = 2800;
    }

    this.updateEnemies(dt);
    this.updateAim();
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateExplosions(dt);
    this.effects.update(dt);
    this.world.x = this.effects.shakeX;
    this.world.y = this.effects.shakeY;
    this.effectsLayer.x = this.effects.shakeX;
    this.effectsLayer.y = this.effects.shakeY;
    if (this.frenzyTimerMs > 0 || this.wasFrenzyActive) {
      this.drawMachine();
    }
    this.wasFrenzyActive = this.frenzyTimerMs > 0;
    this.drawHud();
  }

  private layoutScene(): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const controlsH = Math.max(310, Math.min(360, height * 0.42));
    const sideBarW = Math.max(40, Math.min(60, width * 0.07));

    this.layout = {
      width,
      height,
      playX: sideBarW + 12,
      playY: 16,
      playW: Math.max(320, width - sideBarW * 2 - 48),
      playH: Math.max(260, height - controlsH - 28),
      controlsY: height - controlsH + 12,
      machineX: width / 2,
      machineY: Math.max(220, height - controlsH - 44),
    };

    this.drawBackground();
    this.drawMachine();
    this.drawHud();
    this.drawSettingsButton();
    this.drawDebugUpgradeButton();
    this.layoutQuestionControls();
  }

  private drawSettingsButton(): void {
    const { playX, playW, height } = this.layout;
    const buttonW = 42;
    const buttonH = 34;
    this.settingsButton.x = playX + playW - buttonW - 6;
    this.settingsButton.y = height - buttonH - 14;
    this.settingsButton.hitArea = new Rectangle(0, 0, buttonW, buttonH);
    this.settingsButtonBg.clear();
    this.settingsButtonBg.rect(0, 0, buttonW, buttonH).fill(0x0b1f33).stroke({ width: 2, color: 0x38bdf8 });
    this.settingsButtonIcon.clear();
    this.drawGearIcon(this.settingsButtonIcon, buttonW / 2, buttonH / 2, 10);
  }

  private drawDebugUpgradeButton(): void {
    const { playX, playW, height } = this.layout;
    const buttonW = 104;
    const buttonH = 34;
    this.debugUpgradeButton.x = playX + playW - buttonW - 56;
    this.debugUpgradeButton.y = height - buttonH - 14;
    this.debugUpgradeButton.hitArea = new Rectangle(0, 0, buttonW, buttonH);
    this.debugUpgradeButtonBg.clear();
    this.debugUpgradeButtonBg.rect(0, 0, buttonW, buttonH).fill(0x0b1f33).stroke({ width: 2, color: 0xa78bfa });
    this.debugUpgradeButtonBg.rect(8, 8, 12, 3).fill(0xa78bfa);
    this.debugUpgradeButtonBg.rect(buttonW - 20, buttonH - 11, 12, 3).fill(0xa78bfa);
    this.debugUpgradeButtonText.x = 14;
    this.debugUpgradeButtonText.y = 8;
  }

  private drawGearIcon(graphics: Graphics, x: number, y: number, radius: number): void {
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const toothX = x + Math.cos(angle) * (radius + 4);
      const toothY = y + Math.sin(angle) * (radius + 4);
      graphics
        .rect(toothX - 2, toothY - 2, 4, 4)
        .fill(0xb7f9ff);
    }

    graphics.circle(x, y, radius).fill(0xb7f9ff);
    graphics.circle(x, y, radius - 4).fill(0x0b1f33);
    graphics.circle(x, y, 3).fill(0x38bdf8);
  }

  private drawBackground(): void {
    const { width, height, playX, playY, playW, playH, controlsY } = this.layout;
    this.background.clear();
    this.background.rect(0, 0, width, height).fill(0x071421);
    this.background.rect(playX - 10, playY - 10, playW + 20, playH + 20).fill(0x0c2235);
    this.background.rect(playX, playY, playW, playH).fill(0x102f4d);
    this.background.rect(playX, playY + playH - 34, playW, 34).fill(0x214b39);
    this.background
      .rect(playX, playY, playW, playH)
      .stroke({ width: 2, color: 0x67e8f9, alpha: 0.85 });
    this.background
      .moveTo(playX, playY + 28)
      .lineTo(playX + playW, playY + 28)
      .stroke({ width: 1, color: 0x38bdf8, alpha: 0.18 });
    this.background.rect(0, controlsY - 16, width, height - controlsY + 16).fill(0x091a2a);
    this.background.rect(playX - 10, controlsY - 8, playW + 20, height - controlsY).stroke({
      width: 2,
      color: 0x1fb6d8,
      alpha: 0.6,
    });

    for (let i = 0; i < 16; i += 1) {
      const x = playX + ((i * 83) % playW);
      const y = playY + 18 + ((i * 47) % Math.max(80, playH - 90));
      this.background.circle(x, y, 1.6).fill({ color: 0xcff6ff, alpha: 0.7 });
    }
  }

  private drawMachine(): void {
    const { machineX, machineY } = this.layout;
    const sizeBoost = Math.min(36, this.upgradeCounter * 4);
    const frenzyPulse = this.frenzyPulse();
    const coreColor = this.frenzyTimerMs > 0 ? 0xff2d2d : 0x2dd4bf;
    const bodyColor = this.frenzyTimerMs > 0 ? 0x7f1d1d : 0x475569;
    const strokeColor = this.frenzyTimerMs > 0 ? 0xff6b6b : 0x67e8f9;
    this.machine.x = machineX;
    this.machine.y = machineY;
    this.machineArt.clear();
    this.machineArt.rect(-60 - sizeBoost, 10, 120 + sizeBoost * 2, 30).fill(0x1f2937).stroke({
      width: 2,
      color: strokeColor,
      alpha: this.frenzyTimerMs > 0 ? 0.55 + frenzyPulse * 0.45 : 0.5,
    });
    this.machineArt.rect(-38 - sizeBoost * 0.4, -8, 76 + sizeBoost * 0.8, 36).fill(bodyColor);
    this.machineArt.circle(0, 7, 18 + sizeBoost * 0.12 + frenzyPulse * 3).fill(coreColor).stroke({
      width: 2 + frenzyPulse * 2,
      color: this.frenzyTimerMs > 0 ? 0xffcaca : 0xb7f9ff,
    });
    this.machineArt.circle(0, 7, 8).fill(0x0f172a);
    this.weapons.forEach((weapon) => this.drawWeaponTurret(weapon, sizeBoost));
  }

  private drawWeaponTurret(weapon: Weapon, sizeBoost: number): void {
    const frenzyPulse = this.frenzyPulse();
    const mountStroke = this.frenzyTimerMs > 0 ? 0xff6b6b : 0x7dd3fc;
    const darkMetal = this.frenzyTimerMs > 0 ? 0x450a0a : 0x111827;
    const barrelDark = this.frenzyTimerMs > 0 ? 0x7f1d1d : 0x1f2937;
    const barrelLight = this.frenzyTimerMs > 0 ? 0xffb4b4 : 0xe0f2fe;
    weapon.turret.x = weapon.mountX * (1 + sizeBoost / 120);
    weapon.turret.y = weapon.mountY;
    weapon.turret.visible = weapon.unlocked;
    weapon.art.clear();

    if (!weapon.unlocked) {
      return;
    }

    weapon.art.circle(0, 0, 11 + frenzyPulse * 2).fill(darkMetal).stroke({ width: 2 + frenzyPulse, color: mountStroke });

    if (weapon.kind === 'railGun') {
      weapon.art.rect(-6, -weapon.muzzleLength, 12, weapon.muzzleLength).fill(barrelDark);
      weapon.art.rect(-3, -weapon.muzzleLength - 14, 6, 16).fill(barrelLight);
    } else if (weapon.kind === 'machineGun') {
      weapon.art.rect(-14, -weapon.muzzleLength, 7, weapon.muzzleLength).fill(this.frenzyTimerMs > 0 ? 0x991b1b : 0x020617);
      weapon.art.rect(7, -weapon.muzzleLength, 7, weapon.muzzleLength).fill(this.frenzyTimerMs > 0 ? 0x991b1b : 0x020617);
      weapon.art.rect(-3, -weapon.muzzleLength + 8, 6, weapon.muzzleLength - 8).fill(0x334155);
    } else if (weapon.kind === 'missileLauncher') {
      weapon.art.rect(-15, -weapon.muzzleLength, 12, weapon.muzzleLength).fill(this.frenzyTimerMs > 0 ? 0xef4444 : 0x94a3b8);
      weapon.art.rect(3, -weapon.muzzleLength, 12, weapon.muzzleLength).fill(this.frenzyTimerMs > 0 ? 0xef4444 : 0x94a3b8);
    } else if (weapon.kind === 'lightningGun') {
      weapon.art.moveTo(0, 0).lineTo(12, -24).lineTo(3, -24).lineTo(16, -weapon.muzzleLength).stroke({
        width: 5,
        color: 0xfacc15,
        cap: 'round',
        join: 'round',
      });
    } else {
      weapon.art.circle(0, -weapon.muzzleLength * 0.45, 12).fill(0xa78bfa);
      weapon.art.rect(-4, -weapon.muzzleLength, 8, weapon.muzzleLength * 0.65).fill(0x4c1d95);
    }
  }

  private drawHud(): void {
    const { width, playX, playY, playW, playH, controlsY } = this.layout;
    const healthPct = Math.max(0, this.machineHp / this.maxMachineHp);
    const regularEnemiesLeft = Math.max(0, this.totalEnemies - this.destroyedEnemies);
    const enemiesPct = this.waveMode === 'boss' ? 0 : Math.max(0, regularEnemiesLeft / this.totalEnemies);
    const comboPct = Math.min(1, this.combo / this.maxCombo);
    const upgradePct = Math.min(1, this.correctSinceUpgrade / 5);
    const comboWarning = this.combo === this.maxCombo - 1 && this.frenzyTimerMs <= 0;
    const warningPulse = (Math.sin(performance.now() / 420) + 1) / 2;
    const barH = Math.max(80, playH - 20);

    this.healthBar.clear();
    this.healthBar.rect(14, playY + 6, 36, barH + 8).fill(0x081827).stroke({ width: 2, color: 0x22d3ee });
    this.healthBar.rect(26, playY + 18, 12, barH - 16).fill(0x102f4d);
    this.healthBar.rect(26, playY + 18 + (barH - 16) * (1 - healthPct), 12, (barH - 16) * healthPct).fill(0x22c55e);
    for (let i = 0; i < 7; i += 1) {
      this.healthBar.rect(20, playY + 28 + i * ((barH - 42) / 6), 24, 2).fill({ color: 0x7dd3fc, alpha: 0.5 });
    }

    this.enemyBar.clear();
    this.enemyBar.rect(width - 50, playY + 6, 36, barH + 8).fill(0x081827).stroke({ width: 2, color: 0xfb7185 });
    this.enemyBar.rect(width - 38, playY + 18, 12, barH - 16).fill(0x102f4d);
    this.enemyBar.rect(width - 38, playY + 18 + (barH - 16) * (1 - enemiesPct), 12, (barH - 16) * enemiesPct).fill(0xef4444);
    for (let i = 0; i < 7; i += 1) {
      this.enemyBar.rect(width - 44, playY + 28 + i * ((barH - 42) / 6), 24, 2).fill({ color: 0xfda4af, alpha: 0.45 });
    }

    this.comboBar.clear();
    this.upgradeBar.clear();
    const upgradeY = controlsY + 34;
    const comboY = controlsY + 78;

    this.upgradeBar.rect(playX, upgradeY, playW, 30).fill(0x06131f).stroke({ width: 2, color: 0xa78bfa });
    this.upgradeBar.rect(playX + 4, upgradeY + 4, Math.max(0, (playW - 8) * upgradePct), 22).fill(0x8b5cf6);
    this.upgradeMeterText.text = `Upgrade Meter: ${this.correctSinceUpgrade}/5`;
    this.upgradeMeterText.x = playX + 14;
    this.upgradeMeterText.y = upgradeY + 4;

    const comboBorderColor = comboWarning ? 0xff3333 : 0x22d3ee;
    const comboBackColor = comboWarning ? 0x260909 : 0x06131f;
    const comboFillColor = this.frenzyTimerMs > 0 ? 0xffc107 : comboWarning ? 0xff3333 : 0x06b6d4;
    this.comboBar.rect(playX, comboY, playW, 42).fill(comboBackColor).stroke({
      width: comboWarning ? 4 : 3,
      color: comboBorderColor,
      alpha: comboWarning ? 0.45 + warningPulse * 0.55 : 1,
    });
    this.comboBar.rect(playX + 5, comboY + 5, Math.max(0, (playW - 10) * comboPct), 32).fill(
      { color: comboFillColor, alpha: comboWarning ? 0.55 + warningPulse * 0.45 : 1 },
    );
    for (let i = 1; i < this.maxCombo; i += 1) {
      const x = playX + (playW / this.maxCombo) * i;
      this.comboBar.rect(x - 1, comboY + 4, 2, 34).fill({ color: 0x9be8ff, alpha: 0.65 });
    }
    this.comboMeterText.x = playX + playW / 2;
    this.comboMeterText.y = comboY + 10;
    this.comboMeterText.anchor.set(0.5, 0);

    const waveLabel = this.waveMode === 'boss' ? 'BOSS WAVE' : `Enemies left: ${regularEnemiesLeft}`;
    this.statusText.text = `Stage: ${this.stage}   Robot upgrades: ${this.upgradeCounter}   Combo: ${this.combo}/${this.maxCombo}   ${waveLabel}`;
    this.statusText.x = playX;
    this.statusText.y = controlsY + 4;
  }

  private frenzyPulse(): number {
    if (this.frenzyTimerMs <= 0) {
      return 0;
    }

    return (Math.sin(performance.now() / 95) + 1) / 2;
  }

  private layoutQuestionControls(): void {
    const { playX, playW, controlsY } = this.layout;
    this.questionText.x = playX;
    this.questionText.y = controlsY + 136;
    this.questionText.style.wordWrap = true;
    this.questionText.style.wordWrapWidth = playW;

    const buttonY = controlsY + 184;
    const gap = 12;
    const buttonW = (playW - gap * 2) / 3;

    this.questionButtons.forEach((button, index) => {
      button.x = playX + index * (buttonW + gap);
      button.y = buttonY;
      this.drawButton(button, buttonW, 76, index);
    });
  }

  private showQuestion(): void {
    const question = this.activeQuestions[this.currentQuestionIndex % this.activeQuestions.length];
    this.questionText.text = question.prompt;

    this.questionButtons.forEach((button) => button.destroy({ children: true }));
    this.questionButtons = question.choices.map((choice, index) => this.createQuestionButton(choice, index));
    this.questionButtons.forEach((button) => this.ui.addChild(button));
    this.layoutQuestionControls();
  }

  private createQuestionButton(choice: string, index: number): QuestionButton {
    const button = new Container() as QuestionButton;
    const bg = new Graphics();
    const labelLayer = new Container();
    button.answerText = choice;
    button.labelLayer = labelLayer;
    button.addChild(bg, labelLayer);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.on('pointertap', () => this.answerQuestion(index));
    return button;
  }

  private drawButton(button: QuestionButton, width: number, height: number, index: number): void {
    const bg = button.children[0] as Graphics;
    bg.clear();
    bg.rect(0, 0, width, height).fill(0x0b1f33).stroke({ width: 4, color: 0x38bdf8 });
    bg.moveTo(12, height - 10).lineTo(width - 12, height - 10).stroke({ width: 2, color: 0x7dd3fc, alpha: 0.7 });
    bg.rect(10, 10, 26, 5).fill(0x22d3ee);
    bg.rect(width - 36, 10, 26, 5).fill(0x22d3ee);
    renderMathText(button.labelLayer, button.answerText, width - 24, 23);
    button.labelLayer.x = width / 2;
    button.labelLayer.y = height / 2;
    button.hitArea = new Rectangle(0, 0, width, height);
    button.alpha = this.paused ? 0.5 : 1;
    button.zIndex = index;
  }

  private answerQuestion(index: number): void {
    this.sounds.unlock();
    if (this.paused) {
      return;
    }

    const question = this.activeQuestions[this.currentQuestionIndex % this.activeQuestions.length];
    if (index === question.correctIndex) {
      this.sounds.correct();
      this.combo += 1;
      this.upgradeCounter += 1;
      this.correctSinceUpgrade += 1;
      if (this.combo >= this.maxCombo) {
        this.triggerFrenzy();
      }
      if (this.correctSinceUpgrade >= 5) {
        this.correctSinceUpgrade = 0;
        this.openUpgradeDialog();
      }
    } else {
      this.sounds.wrong();
      this.combo = 0;
    }

    this.currentQuestionIndex += 1;
    this.showQuestion();
    this.drawHud();
  }

  private triggerFrenzy(): void {
    this.frenzyTimerMs = 3200;
    this.combo = 0;
    this.sounds.frenzy();
    this.effects.spawnFrenzyBurst(this.layout.machineX, this.layout.machineY - 42);

    if (this.enemies.length === 0) {
      return;
    }

    const targets = [...this.enemies].sort((a, b) => a.x - b.x);
    for (let i = 0; i < 18; i += 1) {
      const target = targets[i % targets.length];
      const startX = this.layout.machineX - 132 + i * 15;
      const startY = this.layout.machineY - 42 - (i % 3) * 10;
      this.spawnTargetedProjectile(startX, startY, target, 580 + (i % 4) * 35, 34, 6, 'missileLauncher');
    }
  }

  private spawnTargetedProjectile(
    startX: number,
    startY: number,
    target: Enemy,
    speed: number,
    damage: number,
    radius: number,
    kind: WeaponKind,
  ): void {
    const dx = target.x - startX;
    const dy = target.y - startY;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.spawnProjectile({
      x: startX,
      y: startY,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      damage,
      radius,
      fromEnemy: false,
      kind,
    });
  }

  private openSettingsDialog(): void {
    this.sounds.unlock();
    this.paused = true;
    this.overlay.removeChildren();

    const { width, height } = this.layout;
    const shade = new Graphics();
    shade.rect(0, 0, width, height).fill({ color: 0x020617, alpha: 0.78 });

    const panel = new Container();
    const panelW = Math.min(520, width - 40);
    const panelH = 260;
    panel.x = (width - panelW) / 2;
    panel.y = (height - panelH) / 2;

    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill(0x081827).stroke({ width: 3, color: 0x38bdf8 });
    bg.rect(18, 18, panelW - 36, panelH - 36).stroke({ width: 1, color: 0x7dd3fc, alpha: 0.45 });

    const title = new Text({
      text: 'Audio settings',
      style: {
        fontFamily: DefaultFont,
        fontSize: 28,
        fill: 0xb7f9ff,
        fontWeight: '700',
        letterSpacing: 2,
        dropShadow: { color: 0x0ea5e9, blur: 5, distance: 0 },
      },
    });
    title.x = 28;
    title.y = 26;

    const valueText = new Text({
      text: '',
      style: { fontFamily: DefaultFont, fontSize: 18, fill: 0xbae6fd, fontWeight: '700', letterSpacing: 1 },
    });
    valueText.x = 28;
    valueText.y = 88;

    const slider = new Container();
    const sliderBg = new Graphics();
    const sliderFill = new Graphics();
    const knob = new Graphics();
    const sliderW = panelW - 70;
    const sliderH = 34;
    slider.x = 35;
    slider.y = 126;
    slider.eventMode = 'static';
    slider.cursor = 'pointer';
    slider.hitArea = new Rectangle(0, -10, sliderW, sliderH + 20);
    slider.addChild(sliderBg, sliderFill, knob);

    const drawSlider = () => {
      const volume = this.sounds.getVolume();
      valueText.text = `Master volume: ${Math.round(volume * 100)}%`;
      sliderBg.clear();
      sliderFill.clear();
      knob.clear();
      sliderBg.rect(0, 8, sliderW, 18).fill(0x0b1f33).stroke({ width: 2, color: 0x38bdf8 });
      sliderFill.rect(4, 12, Math.max(0, (sliderW - 8) * volume), 10).fill(0x22d3ee);
      knob.circle(4 + (sliderW - 8) * volume, 17, 13).fill(0xb7f9ff).stroke({ width: 3, color: 0x0ea5e9 });
    };

    const setVolumeFromEvent = (event: FederatedPointerEvent) => {
      const local = slider.toLocal(event.global);
      this.sounds.setVolume(local.x / sliderW);
      drawSlider();
    };

    let dragging = false;
    slider.on('pointerdown', (event) => {
      dragging = true;
      setVolumeFromEvent(event);
    });
    slider.on('globalpointermove', (event) => {
      if (dragging) {
        setVolumeFromEvent(event);
      }
    });
    slider.on('pointerup', () => {
      dragging = false;
      this.sounds.correct();
    });
    slider.on('pointerupoutside', () => {
      dragging = false;
    });

    const testButton = this.createDialogButton('TEST', 28, 190, 130, 42, () => this.sounds.frenzy());
    const closeButton = this.createDialogButton('CLOSE', panelW - 158, 190, 130, 42, () => {
      this.overlay.removeChildren();
      this.paused = false;
      this.layoutQuestionControls();
      this.drawHud();
    });

    drawSlider();
    panel.addChild(bg, title, valueText, slider, testButton, closeButton);
    this.overlay.addChild(shade, panel);
  }

  private createDialogButton(label: string, x: number, y: number, width: number, height: number, onTap: () => void): Container {
    const button = new Container();
    const bg = new Graphics();
    const text = new Text({
      text: label,
      style: { fontFamily: DefaultFont, fontSize: 18, fill: 0xb7f9ff, fontWeight: '700', letterSpacing: 1 },
    });
    bg.rect(0, 0, width, height).fill(0x0b1f33).stroke({ width: 3, color: 0x38bdf8 });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    button.x = x;
    button.y = y;
    button.addChild(bg, text);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new Rectangle(0, 0, width, height);
    button.on('pointertap', () => {
      this.sounds.unlock();
      onTap();
    });
    return button;
  }

  private openUpgradeDialog(): void {
    this.paused = true;
    this.overlay.removeChildren();

    const { width, height } = this.layout;
    const shade = new Graphics();
    shade.rect(0, 0, width, height).fill({ color: 0x020617, alpha: 0.88 });

    const panel = new Container();
    const panelW = Math.min(720, width - 40);
    const panelH = Math.min(390, height - 40);
    panel.x = (width - panelW) / 2;
    panel.y = (height - panelH) / 2;

    const bg = new Graphics();
    bg.rect(0, 0, panelW, panelH).fill(0x081827).stroke({ width: 3, color: 0x38bdf8 });
    bg.rect(18, 18, panelW - 36, panelH - 36).stroke({ width: 1, color: 0x7dd3fc, alpha: 0.45 });

    const title = new Text({
      text: 'Choose an upgrade',
      style: {
        fontFamily: DefaultFont,
        fontSize: 36,
        fill: 0xb7f9ff,
        fontWeight: '700',
        letterSpacing: 2,
        dropShadow: { color: 0x0ea5e9, blur: 5, distance: 0 },
      },
    });
    title.x = 28;
    title.y = 24;

    panel.addChild(bg, title);
    this.pickUpgrades().forEach((upgrade, index) => {
      const card = this.createUpgradeCard(upgrade, (panelW - 80) / 3, 190);
      card.x = 28 + index * ((panelW - 80) / 3 + 12);
      card.y = 104;
      panel.addChild(card);
    });

    const skipButton = this.createDialogButton('SKIP', panelW - 138, panelH - 62, 110, 38, () => this.closeUpgradeDialog());
    panel.addChild(skipButton);

    this.overlay.addChild(shade, panel);
  }

  private createUpgradeCard(upgrade: Upgrade, width: number, height: number): Container {
    const card = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, width, height).fill(0x0b1f33).stroke({ width: 2, color: 0x38bdf8 });
    bg.rect(10, 10, width - 20, height - 20).stroke({ width: 1, color: 0x7dd3fc, alpha: 0.35 });
    const title = new Text({
      text: upgrade.label,
      style: {
        fontFamily: DefaultFont,
        fontSize: 24,
        fill: 0xb7f9ff,
        fontWeight: '700',
        letterSpacing: 1,
        wordWrap: true,
        wordWrapWidth: width - 24,
      },
    });
    title.x = 12;
    title.y = 14;
    const description = new Text({
      text: upgrade.description,
      style: {
        fontFamily: DetailTextFont,
        fontSize: 18,
        fill: 0xbae6fd,
        wordWrap: true,
        wordWrapWidth: width - 24,
      },
    });
    description.x = 12;
    description.y = 70;
    card.addChild(bg, title, description);
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new Rectangle(0, 0, width, height);
    card.on('pointertap', () => {
      this.sounds.unlock();
      this.sounds.upgrade();
      upgrade.apply();
      this.closeUpgradeDialog();
      this.drawMachine();
    });
    return card;
  }

  private closeUpgradeDialog(): void {
    this.overlay.removeChildren();
    this.paused = false;
    this.layoutQuestionControls();
    this.drawHud();
  }

  private pickUpgrades(): Upgrade[] {
    const upgrades: Upgrade[] = [
      {
        label: 'Tune rail gun',
        description: 'Rail gun damage goes up and it cycles faster.',
        apply: () => this.powerUpWeapon('railGun', 5, 0.9),
      },
      {
        label: this.isUnlocked('machineGun') ? 'Overclock machine gun' : 'Add machine gun',
        description: 'Fires bursts of five small rounds.',
        apply: () => this.unlockOrPowerUpWeapon('machineGun', 2, 0.88),
      },
      {
        label: this.isUnlocked('missileLauncher') ? 'Bigger missiles' : 'Add missile launcher',
        description: 'Slow, heavy shots with large explosions.',
        apply: () => this.unlockOrPowerUpWeapon('missileLauncher', 8, 0.92),
      },
      {
        label: this.isUnlocked('lightningGun') ? 'Chain lightning' : 'Add lightning gun',
        description: 'Fast electric arcs that hit saucers instantly.',
        apply: () => this.unlockOrPowerUpWeapon('lightningGun', 4, 0.9),
      },
      {
        label: this.isUnlocked('droneLauncher') ? 'More drones' : 'Add drone launcher',
        description: 'Autonomous side pods add extra fire.',
        apply: () => this.unlockOrPowerUpWeapon('droneLauncher', 3, 0.9),
      },
    ];

    return upgrades.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  private unlockOrPowerUpWeapon(kind: WeaponKind, damageBoost: number, rateMultiplier: number): void {
    const weapon = this.weapons.find((candidate) => candidate.kind === kind);
    if (!weapon) {
      return;
    }
    weapon.unlocked = true;
    weapon.level += 1;
    weapon.damage += damageBoost;
    weapon.fireRateMs = Math.max(180, weapon.fireRateMs * rateMultiplier);
  }

  private powerUpWeapon(kind: WeaponKind, damageBoost: number, rateMultiplier: number): void {
    const weapon = this.weapons.find((candidate) => candidate.kind === kind);
    if (!weapon) {
      return;
    }
    weapon.level += 1;
    weapon.damage += damageBoost;
    weapon.fireRateMs = Math.max(160, weapon.fireRateMs * rateMultiplier);
  }

  private updateWeapons(dt: number): void {
    const speedMultiplier = this.frenzyTimerMs > 0 ? 3 : 1;
    for (const weapon of this.weapons) {
      if (!weapon.unlocked || this.enemies.length === 0) {
        continue;
      }
      weapon.nextFireMs -= dt * speedMultiplier;
      if (weapon.nextFireMs <= 0) {
        this.fireWeapon(weapon);
        weapon.nextFireMs = weapon.fireRateMs;
      }
    }
  }

  private fireWeapon(weapon: Weapon): void {
    const target = this.closestEnemyToWeapon(weapon);
    if (!target) {
      return;
    }
    this.sounds.weapon(weapon.kind);

    if (weapon.kind === 'machineGun') {
      for (let i = 0; i < 5; i += 1) {
        this.fireLinearProjectile(weapon, target, -16 + i * 8, 520 + i * 12, 3);
      }
      return;
    }

    if (weapon.kind === 'missileLauncher') {
      this.fireLinearProjectile(weapon, target, Math.random() > 0.5 ? -9 : 9, 330, 7);
      return;
    }

    if (weapon.kind === 'lightningGun') {
      this.drawLightning(weapon, target);
      this.damageEnemy(target, weapon.damage);
      return;
    }

    if (weapon.kind === 'droneLauncher') {
      this.fireLinearProjectile(weapon, target, -92, 430, 4);
      this.fireLinearProjectile(weapon, target, 92, 430, 4);
      return;
    }

    this.fireLinearProjectile(weapon, target, 0, 720, 4);
  }

  private fireLinearProjectile(weapon: Weapon, target: Enemy, offsetX: number, speed: number, radius: number): void {
    const muzzle = this.turretMuzzle(weapon, offsetX);
    const startX = muzzle.x;
    const startY = muzzle.y;
    const dx = target.x - startX;
    const dy = target.y - startY;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.effects.spawnMuzzleFlash(startX, startY, weapon.turret.rotation, weapon.kind);
    this.spawnProjectile({
      x: startX,
      y: startY,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      damage: weapon.damage,
      radius,
      fromEnemy: false,
      kind: weapon.kind,
    });
  }

  private updateAim(): void {
    for (const weapon of this.weapons) {
      const target = this.closestEnemyToWeapon(weapon);
      if (!weapon.unlocked || !target) {
        weapon.turret.rotation *= 0.9;
        continue;
      }

      const dx = target.x - (this.layout.machineX + weapon.turret.x);
      const dy = target.y - (this.layout.machineY + weapon.turret.y);
      weapon.turret.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  private turretMuzzle(weapon: Weapon, offsetX: number): { x: number; y: number } {
    const localX = offsetX;
    const localY = -weapon.muzzleLength;
    const cos = Math.cos(weapon.turret.rotation);
    const sin = Math.sin(weapon.turret.rotation);

    return {
      x: this.layout.machineX + weapon.turret.x + localX * cos - localY * sin,
      y: this.layout.machineY + weapon.turret.y + localX * sin + localY * cos,
    };
  }

  private spawnProjectile(projectileData: Omit<Projectile, 'graphic'>): void {
    const graphic = new Graphics();
    const projectile: Projectile = { ...projectileData, graphic };
    this.drawProjectile(projectile);
    this.projectiles.push(projectile);
    this.world.addChild(graphic);
  }

  private drawProjectile(projectile: Projectile): void {
    const color = projectile.fromEnemy
      ? 0xff4d8d
      : projectile.kind === 'missileLauncher'
        ? 0xff7a18
        : projectile.kind === 'railGun'
          ? 0xa7f3ff
          : 0xf8fafc;
    projectile.graphic.clear();
    projectile.graphic.circle(0, 0, projectile.radius).fill(color);
    projectile.graphic.x = projectile.x;
    projectile.graphic.y = projectile.y;
  }

  private drawLightning(weapon: Weapon, target: Enemy): void {
    const muzzle = this.turretMuzzle(weapon, 0);
    const bolt = new Graphics();
    this.effects.spawnMuzzleFlash(muzzle.x, muzzle.y, weapon.turret.rotation, weapon.kind);
    this.effects.spawnImpact(target.x, target.y, weapon.kind);
    bolt.moveTo(muzzle.x, muzzle.y);
    for (let i = 1; i <= 5; i += 1) {
      const t = i / 5;
      const x = muzzle.x + (target.x - muzzle.x) * t + (Math.random() - 0.5) * 22;
      const y = muzzle.y + (target.y - muzzle.y) * t;
      bolt.lineTo(x, y);
    }
    bolt.stroke({ width: 4, color: 0xfacc15, alpha: 0.95, cap: 'round', join: 'round' });
    this.world.addChild(bolt);
    this.explosions.push({ graphic: bolt, x: target.x, y: target.y, ageMs: 0, durationMs: 120, maxRadius: 0 });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.x += (projectile.vx / 1000) * dt;
      projectile.y += (projectile.vy / 1000) * dt;
      this.drawProjectile(projectile);
      this.effects.spawnTrail(projectile.x, projectile.y, projectile.kind);

      if (projectile.fromEnemy) {
        if (Math.hypot(projectile.x - this.layout.machineX, projectile.y - this.layout.machineY) < 34) {
          this.machineHp = Math.max(0, this.machineHp - projectile.damage);
          this.sounds.hit();
          this.effects.spawnImpact(projectile.x, projectile.y, projectile.kind);
          this.spawnExplosion(projectile.x, projectile.y, 24);
          this.removeProjectile(i);
        }
      } else {
        const enemy = this.enemies.find((candidate) => Math.hypot(candidate.x - projectile.x, candidate.y - projectile.y) < candidate.radius);
        if (enemy) {
          this.damageEnemy(enemy, projectile.damage);
          this.sounds.hit();
          this.effects.spawnImpact(projectile.x, projectile.y, projectile.kind);
          this.spawnExplosion(projectile.x, projectile.y, projectile.kind === 'missileLauncher' ? 46 : 20);
          this.removeProjectile(i);
        }
      }

      if (projectile.x < -80 || projectile.x > this.layout.width + 80 || projectile.y < -80 || projectile.y > this.layout.height + 80) {
        this.removeProjectile(i);
      }
    }
  }

  private removeProjectile(index: number): void {
    const [projectile] = this.projectiles.splice(index, 1);
    projectile.graphic.destroy();
  }

  private spawnEnemy(kind: Enemy['kind'] = 'small', x?: number): void {
    const { playX, playY, playW, playH } = this.layout;
    const container = new Container();
    const body = new Graphics();
    container.addChild(body);
    const baseY = playY + 48 + Math.random() * Math.min(90, playH * 0.22);
    const isBoss = kind === 'boss';
    const hp = isBoss ? 260 + this.stage * 70 : 45 + this.stage * 6 + this.spawnedEnemies * 2;
    const enemy: Enemy = {
      kind,
      container,
      body,
      x: x ?? playX + 60 + Math.random() * Math.max(1, playW - 120),
      y: isBoss ? playY + 80 : baseY,
      baseY: isBoss ? playY + 80 : baseY,
      hp,
      maxHp: hp,
      speed: isBoss ? 6 : 10 + Math.random() * 10,
      driftPhase: Math.random() * Math.PI * 2,
      nextShotMs: isBoss ? 900 : 1500 + Math.random() * 1800,
      radius: isBoss ? 58 : 28,
    };
    this.drawEnemy(enemy);
    this.enemies.push(enemy);
    if (this.waveMode === 'regular') {
      this.spawnedEnemies += 1;
    }
    this.world.addChild(container);
  }

  private updateEnemies(dt: number): void {
    const { playX, playW, playH, playY } = this.layout;
    for (const enemy of this.enemies) {
      enemy.driftPhase += (enemy.speed / 1000) * dt;
      enemy.x += Math.sin(enemy.driftPhase) * 0.45;
      enemy.y = Math.min(playY + playH * 0.34, enemy.baseY + Math.sin(enemy.driftPhase * 0.65) * 7);
      enemy.nextShotMs -= dt;
      if (enemy.nextShotMs <= 0) {
        this.enemyShoot(enemy);
        enemy.nextShotMs = 2300 + Math.random() * 1600;
      }
      enemy.x = Math.max(playX + 30, Math.min(playX + playW - 30, enemy.x));
      this.drawEnemy(enemy);
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      if (this.enemies[i].hp <= 0) {
        this.spawnExplosion(
          this.enemies[i].x,
          this.enemies[i].y,
          this.enemies[i].kind === 'boss' ? 96 : this.frenzyTimerMs > 0 ? 64 : 34,
        );
        this.sounds.explosion(this.enemies[i].kind === 'boss');
        const defeatedKind = this.enemies[i].kind;
        this.enemies[i].container.destroy({ children: true });
        this.enemies.splice(i, 1);
        if (this.waveMode === 'regular' && defeatedKind === 'small') {
          this.destroyedEnemies += 1;
        }
      }
    }

    if (this.waveMode === 'regular' && this.destroyedEnemies >= this.totalEnemies) {
      this.startBossWave();
    } else if (this.waveMode === 'boss' && this.enemies.length === 0) {
      this.startNextStage();
    }
  }

  private startBossWave(): void {
    this.waveMode = 'boss';
    this.spawnTimerMs = 0;
    this.sounds.boss();
    const { playX, playW } = this.layout;
    this.spawnEnemy('boss', playX + playW / 2);
    this.effects.spawnBossEntrance(playX + playW / 2, this.layout.playY + 80);
    for (let i = 0; i < 4; i += 1) {
      this.spawnEnemy('small', playX + 80 + i * Math.max(60, (playW - 160) / 3));
    }
  }

  private startNextStage(): void {
    this.stage += 1;
    this.sounds.stage();
    this.waveMode = 'regular';
    this.totalEnemies = 20 + this.stage * 6;
    this.spawnedEnemies = 0;
    this.destroyedEnemies = 0;
    this.spawnTimerMs = 1200;
    this.machineHp = Math.min(this.maxMachineHp, this.machineHp + 18);
    this.currentQuestionIndex = 0;
    this.showQuestion();
  }

  private drawEnemy(enemy: Enemy): void {
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    const scale = enemy.kind === 'boss' ? 1.9 : 1;
    enemy.container.x = enemy.x;
    enemy.container.y = enemy.y;
    enemy.body.clear();
    enemy.body.ellipse(0, 2 * scale, 28 * scale, 10 * scale).fill(enemy.kind === 'boss' ? 0xd946ef : 0xb7f264).stroke({
      width: enemy.kind === 'boss' ? 4 : 2,
      color: enemy.kind === 'boss' ? 0x581c87 : 0x204d2c,
    });
    enemy.body.ellipse(0, -6 * scale, 15 * scale, 11 * scale).fill({ color: 0x9ae6ff, alpha: 0.9 });
    enemy.body.circle(-15 * scale, 6 * scale, 3.2 * scale).fill(0xfff3a3);
    enemy.body.circle(0, 8 * scale, 3.2 * scale).fill(0xfff3a3);
    enemy.body.circle(15 * scale, 6 * scale, 3.2 * scale).fill(0xfff3a3);
    if (enemy.kind === 'boss') {
      enemy.body.circle(-34, -1, 5).fill(0xff4d8d);
      enemy.body.circle(34, -1, 5).fill(0xff4d8d);
    }
    enemy.body.rect(-20 * scale, -24 * scale, 40 * scale, 5 * scale).fill(0x092437);
    enemy.body.rect(-20 * scale, -24 * scale, 40 * scale * hpPct, 5 * scale).fill(0xef4444);
  }

  private enemyShoot(enemy: Enemy): void {
    this.sounds.alienShot();
    const dx = this.layout.machineX - enemy.x;
    const dy = this.layout.machineY - enemy.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.effects.spawnMuzzleFlash(enemy.x, enemy.y + 18, Math.atan2(dy, dx) + Math.PI / 2, 'alienBolt');
    this.spawnProjectile({
      x: enemy.x,
      y: enemy.y + 18,
      vx: (dx / length) * 230,
      vy: (dy / length) * 230,
      damage: enemy.kind === 'boss' ? 12 : 6,
      radius: enemy.kind === 'boss' ? 8 : 5,
      fromEnemy: true,
      kind: 'alienBolt',
    });
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    enemy.hp -= damage;
  }

  private spawnExplosion(x: number, y: number, maxRadius: number): void {
    const graphic = new Graphics();
    this.explosions.push({ graphic, x, y, ageMs: 0, durationMs: 360, maxRadius });
    this.world.addChild(graphic);
    this.effects.spawnExplosion(x, y, maxRadius >= 60);
  }

  private updateExplosions(dt: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i -= 1) {
      const explosion = this.explosions[i];
      explosion.ageMs += dt;

      if (explosion.maxRadius > 0) {
        const t = Math.min(1, explosion.ageMs / explosion.durationMs);
        explosion.graphic.clear();
        explosion.graphic.circle(explosion.x, explosion.y, explosion.maxRadius * t).fill({
          color: 0xffd166,
          alpha: 1 - t,
        });
        explosion.graphic.circle(explosion.x, explosion.y, explosion.maxRadius * 0.5 * t).fill({
          color: 0xff4d00,
          alpha: 0.7 - t * 0.7,
        });
      } else {
        explosion.graphic.alpha = Math.max(0, 1 - explosion.ageMs / explosion.durationMs);
      }

      if (explosion.ageMs >= explosion.durationMs) {
        explosion.graphic.destroy();
        this.explosions.splice(i, 1);
      }
    }
  }

  private closestEnemyToWeapon(weapon: Weapon): Enemy | undefined {
    const weaponX = this.layout.machineX + weapon.turret.x;
    const weaponY = this.layout.machineY + weapon.turret.y;

    return this.enemies
      .slice()
      .sort((a, b) => Math.hypot(a.x - weaponX, a.y - weaponY) - Math.hypot(b.x - weaponX, b.y - weaponY))[0];
  }

  private isUnlocked(kind: WeaponKind): boolean {
    return this.weapons.some((weapon) => weapon.kind === kind && weapon.unlocked);
  }

}
