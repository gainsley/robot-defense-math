import type { Container, Graphics } from 'pixi.js';

export type Question = {
  prompt: string;
  choices: string[];
  correctIndex: number;
};

export type QuestionGenerator = () => Question;

export type LevelQuestions = {
  level: number;
  generators: QuestionGenerator[];
};

export type QuestionGens = {
  level: number;
  generators: (() => Question)[];
}

export type WeaponKind = 'railGun' | 'machineGun' | 'missileLauncher' | 'lightningGun' | 'droneLauncher';

export type Weapon = {
  kind: WeaponKind;
  label: string;
  level: number;
  fireRateMs: number;
  damage: number;
  nextFireMs: number;
  unlocked: boolean;
  mountX: number;
  mountY: number;
  muzzleLength: number;
  turret: Container;
  art: Graphics;
};

export type Upgrade = {
  label: string;
  description: string;
  weaponKind: WeaponKind;
  apply: () => void;
};

export type EnemyKind = 'small' | 'boss';

export type Enemy = {
  kind: EnemyKind;
  container: Container;
  body: Graphics;
  x: number;
  y: number;
  baseY: number;
  hp: number;
  maxHp: number;
  speed: number;
  driftPhase: number;
  nextShotMs: number;
  radius: number;
};

export type Projectile = {
  graphic: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  fromEnemy: boolean;
  kind: WeaponKind | 'alienBolt';
};

export type Explosion = {
  graphic: Graphics;
  x: number;
  y: number;
  ageMs: number;
  durationMs: number;
  maxRadius: number;
};

export type LightningArc = {
  graphic: Graphics;
  weapon: Weapon;
  target: Enemy;
  ageMs: number;
  durationMs: number;
};
