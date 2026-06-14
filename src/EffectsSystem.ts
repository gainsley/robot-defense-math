import { Assets, Container, Sprite, Texture } from 'pixi.js';
import type { WeaponKind } from './types';
import { hexNumber } from './utils';

export type EffectKind = WeaponKind | 'alienBolt';

type EffectParticle = {
  sprite: Sprite;
  vx: number;
  vy: number;
  ageMs: number;
  durationMs: number;
  startScale: number;
  endScale: number;
  rotationSpeed: number;
  gravity: number;
};

const muzzleUrls = [
  new URL('./assets/Particles/Complex/muzzle flash/muzzle_flash_1.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/muzzle flash/muzzle_flash_2.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/muzzle flash/muzzle_flash_3.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/muzzle flash/muzzle_flash_4.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/muzzle flash/muzzle_flash_5.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/muzzle flash/muzzle_flash_6.png', import.meta.url).href,
];
const impactUrls = [
  new URL('./assets/Particles/Complex/impacts/impact_1.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/impacts/impact_2.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/impacts/impact_3.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/impacts/impact_4.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/impacts/impact_5.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/impacts/impact_6.png', import.meta.url).href,
];
const flareUrls = [
  new URL('./assets/Particles/Complex/flare/flare_1.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/flare/flare_2.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/flare/flare_3.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/flare/flare_4.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/flare/flare_5.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/flare/flare_6.png', import.meta.url).href,
];
const smokeUrls = [
  new URL('./assets/Particles/Complex/smoke/smoke2_1.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/smoke/smoke2_2.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/smoke/smoke2_3.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/smoke/smoke2_4.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/smoke/smoke2_5.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/smoke/smoke2_6.png', import.meta.url).href,
];
const starUrls = [
  new URL('./assets/Particles/Color/star/color_star_1.png', import.meta.url).href,
  new URL('./assets/Particles/Color/star/color_star_2.png', import.meta.url).href,
  new URL('./assets/Particles/Color/star/color_star_3.png', import.meta.url).href,
  new URL('./assets/Particles/Color/star/color_star_4.png', import.meta.url).href,
  new URL('./assets/Particles/Color/star/color_star_5.png', import.meta.url).href,
  new URL('./assets/Particles/Color/star/color_star_6.png', import.meta.url).href,
  new URL('./assets/Particles/Color/star/color_star_7.png', import.meta.url).href,
  new URL('./assets/Particles/Color/star/color_star_8.png', import.meta.url).href,
];
const rayUrls = [
  new URL('./assets/Particles/Complex/others/lightrays_1.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/others/lightrays_2.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/others/lightrays_3.png', import.meta.url).href,
  new URL('./assets/Particles/Complex/others/lightrays_4.png', import.meta.url).href,
];
const spiroUrls = [
  new URL('./assets/Particles/Color/spirowires/color_spirowires_1.png', import.meta.url).href,
  new URL('./assets/Particles/Color/spirowires/color_spirowires_2.png', import.meta.url).href,
  new URL('./assets/Particles/Color/spirowires/color_spirowires_3.png', import.meta.url).href,
  new URL('./assets/Particles/Color/spirowires/color_spirowires_4.png', import.meta.url).href,
];
const fireMagicParticlesUrls = [
  new URL('./assets/Particles/Color/magic particles/magic_particles_1.png', import.meta.url).href,
  new URL('./assets/Particles/Color/magic particles/magic_particles_4.png', import.meta.url).href,
  new URL('./assets/Particles/Color/magic particles/magic_particles_5.png', import.meta.url).href,
];

function randomItem<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

function colorForKind(kind: EffectKind): number {
  if (kind === 'railGun') {
    return 0xa7f3ff;
  }
  if (kind === 'machineGun') {
    return 0xfff3a3;
  }
  if (kind === 'missileLauncher') {
    return 0xff7a18;
  }
  if (kind === 'lightningGun') {
    return 0xfacc15;
  }
  if (kind === 'droneLauncher') {
    return 0xa78bfa;
  }
  return 0xff4d8d;
}

export class EffectsSystem {
  public shakeX = 0;
  public shakeY = 0;

  private readonly particles: EffectParticle[] = [];
  private readonly layer: Container;
  private muzzleTextures: Texture[] = [];
  private impactTextures: Texture[] = [];
  private flareTextures: Texture[] = [];
  private smokeTextures: Texture[] = [];
  private starTextures: Texture[] = [];
  private rayTextures: Texture[] = [];
  private spiroTextures: Texture[] = [];
  private fireMagicParticlesTextures: Texture[] = [];
  private shakeMs = 0;
  private shakeDurationMs = 1;
  private shakeAmount = 0;

  public constructor(layer: Container) {
    this.layer = layer;
    void this.loadTextures();
  }

  public update(dtMs: number): void {
    this.updateShake(dtMs);

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.ageMs += dtMs;

      const t = Math.min(1, particle.ageMs / particle.durationMs);
      particle.vy += (particle.gravity / 1000) * dtMs;
      particle.sprite.x += (particle.vx / 1000) * dtMs;
      particle.sprite.y += (particle.vy / 1000) * dtMs;
      particle.sprite.rotation += (particle.rotationSpeed / 1000) * dtMs;
      particle.sprite.alpha = Math.max(0, 1 - t);
      const scale = particle.startScale + (particle.endScale - particle.startScale) * t;
      particle.sprite.scale.set(scale);

      if (particle.ageMs >= particle.durationMs) {
        particle.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  public spawnMuzzleFlash(x: number, y: number, rotation: number, kind: EffectKind): void {
    const texture = randomItem(this.muzzleTextures);
    if (!texture) {
      return;
    }

    const size = kind === 'missileLauncher' ? 0.42 : kind === 'machineGun' ? 0.22 : 0.3;
    const particle = this.makeParticle(texture, x, y, {
      durationMs: 95,
      startScale: size,
      endScale: size * 1.7,
      blendMode: 'add',
      tint: colorForKind(kind),
      rotation,
    });
    particle.sprite.alpha = 0.9;
  }

  public spawnImpact(x: number, y: number, kind: EffectKind): void {
    const impactTexture = randomItem(this.impactTextures);
    if (impactTexture) {
      this.makeParticle(impactTexture, x, y, {
        durationMs: kind === 'missileLauncher' ? 260 : 180,
        startScale: kind === 'missileLauncher' ? 0.25 : 0.14,
        endScale: kind === 'missileLauncher' ? 0.6 : 0.3,
        blendMode: 'add',
        tint: colorForKind(kind),
        rotationSpeed: (Math.random() - 0.5) * 8,
      });
    }

    this.spawnSparks(x, y, kind === 'missileLauncher' ? 14 : 6, colorForKind(kind), kind === 'missileLauncher' ? 170 : 115);
  }

  public spawnExplosion(x: number, y: number, scale: number): void {
    const flareTexture = randomItem(this.flareTextures);
    if (flareTexture) {
      this.makeParticle(flareTexture, x, y, {
        durationMs: scale * 420,
        startScale: scale * 0.32,
        endScale: scale * 1.15,
        blendMode: 'add',
        tint: scale > 0.5 ? 0xff9f1c : 0xffc857,
        rotationSpeed: 2,
      });
    }

    for (let i = 0; i < (scale * 4); i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = scale * 10;
      this.spawnSmoke(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, scale);
    }

    this.spawnSparks(x, y, scale * 10, 0xfff3a3, scale * 160);
    this.shake(scale * 0.5, scale * 10);
  }

  public spawnTrail(x: number, y: number, kind: EffectKind): void {
    if (kind === 'missileLauncher') {
      if (Math.random() < 0.85) {
        this.spawnSmoke(x, y, 0.2);
      }
      return;
    }

    if (kind === 'alienBolt' || kind === 'railGun' || kind === 'lightningGun') {
      const texture = randomItem(this.starTextures);
      if (!texture || Math.random() > 0.35) {
        return;
      }
      this.makeParticle(texture, x, y, {
        durationMs: 140,
        startScale: 0.02,
        endScale: 0.04,
        blendMode: 'add',
        tint: colorForKind(kind),
        rotationSpeed: (Math.random() - 0.5) * 9,
      });
    }
  }

  public spawnBossEntrance(x: number, y: number): void {
    const rayTexture = randomItem(this.rayTextures);
    if (rayTexture) {
      this.makeParticle(rayTexture, x, y, {
        durationMs: 900,
        startScale: 0.8,
        endScale: 2.4,
        blendMode: 'add',
        tint: 0xd946ef,
        rotationSpeed: 0.9,
      });
    }

    const spiroTexture = randomItem(this.spiroTextures);
    if (spiroTexture) {
      this.makeParticle(spiroTexture, x, y, {
        durationMs: 1000,
        startScale: 0.55,
        endScale: 1.8,
        blendMode: 'add',
        tint: 0xff4d8d,
        rotationSpeed: -1.6,
      });
    }

    this.shake(7, 520);
  }

  public spawnFrenzyBurst(x: number, y: number): void {
    const rayTexture = randomItem(this.rayTextures);
    if (rayTexture) {
      this.makeParticle(rayTexture, x, y, {
        durationMs: 760,
        startScale: 0.5,
        endScale: 2.7,
        blendMode: 'add',
        tint: 0xff3333,
        rotationSpeed: 1.8,
      });
    }
    this.spawnSparks(x, y, 34, 0xff3333, 320);
    this.shake(5, 420);
  }

  private async loadTextures(): Promise<void> {
    const load = async (urls: string[]) => {
      if (urls.length === 0) {
        return [];
      }
      const textures = await Assets.load(urls);
      return Array.isArray(textures) ? textures : Object.values(textures);
    };

    [
      this.muzzleTextures,
      this.impactTextures,
      this.flareTextures,
      this.smokeTextures,
      this.starTextures,
      this.rayTextures,
      this.spiroTextures,
      this.fireMagicParticlesTextures,
    ] = await Promise.all([
      load(muzzleUrls),
      load(impactUrls),
      load(flareUrls),
      load(smokeUrls),
      load(starUrls),
      load(rayUrls),
      load(spiroUrls),
      load(fireMagicParticlesUrls),
    ]);
  }

  private spawnSmoke(x: number, y: number, scale: number): void {
    const texture = randomItem(this.smokeTextures);
    if (!texture) {
      return;
    }

    this.makeParticle(texture, x, y, {
      durationMs: scale * 460,
      startScale: scale * 0.16,
      endScale: scale * 0.55,
      blendMode: 'normal',
      tint: hexNumber("#ebeff7"),
      vx: (Math.random() - 0.5) * (scale * 24),
      vy: -20 - Math.random() * (scale * 22),
      rotationSpeed: (Math.random() - 0.5) * 1.8,
    });
  }

  private spawnSparks(x: number, y: number, count: number, tint: number, speed: number): void {
    for (let i = 0; i < count; i += 1) {
      const texture = randomItem(this.fireMagicParticlesTextures);
      if (!texture) {
        return;
      }

      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.45 + Math.random() * 0.75);
      this.makeParticle(texture, x, y, {
        durationMs: 240 + Math.random() * 180,
        startScale: 0.08 + Math.random() * 0.08,
        endScale: 0.02,
        blendMode: 'add',
        tint,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 80,
      });
    }
  }

  private makeParticle(
    texture: Texture,
    x: number,
    y: number,
    options: {
      durationMs: number;
      startScale: number;
      endScale: number;
      blendMode: 'normal' | 'add';
      tint: number;
      rotation?: number;
      rotationSpeed?: number;
      vx?: number;
      vy?: number;
      gravity?: number;
    },
  ): EffectParticle {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(options.startScale);
    sprite.rotation = options.rotation ?? Math.random() * Math.PI * 2;
    sprite.blendMode = options.blendMode;
    sprite.tint = options.tint;
    this.layer.addChild(sprite);

    const particle: EffectParticle = {
      sprite,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      ageMs: 0,
      durationMs: options.durationMs,
      startScale: options.startScale,
      endScale: options.endScale,
      rotationSpeed: options.rotationSpeed ?? 0,
      gravity: options.gravity ?? 0,
    };
    this.particles.push(particle);
    return particle;
  }

  private shake(amount: number, durationMs: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeMs = Math.max(this.shakeMs, durationMs);
    this.shakeDurationMs = Math.max(this.shakeDurationMs, durationMs);
  }

  private updateShake(dtMs: number): void {
    if (this.shakeMs <= 0) {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeAmount = 0;
      this.shakeDurationMs = 1;
      return;
    }

    this.shakeMs = Math.max(0, this.shakeMs - dtMs);
    const falloff = this.shakeMs / this.shakeDurationMs;
    const amount = this.shakeAmount * falloff;
    this.shakeX = (Math.random() * 2 - 1) * amount;
    this.shakeY = (Math.random() * 2 - 1) * amount;
  }
}
