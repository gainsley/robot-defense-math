import { Container, Graphics } from 'pixi.js';
import type { Weapon, WeaponKind } from './types';

function createWeapon(
  kind: WeaponKind,
  label: string,
  level: number,
  fireRateMs: number,
  damage: number,
  unlocked: boolean,
  mountX: number,
  mountY: number,
  muzzleLength: number,
): Weapon {
  const turret = new Container();
  const art = new Graphics();
  turret.addChild(art);

  return {
    kind,
    label,
    level,
    fireRateMs,
    damage,
    nextFireMs: 0,
    unlocked,
    mountX,
    mountY,
    muzzleLength,
    turret,
    art,
  };
}

export function createInitialWeapons(): Weapon[] {
  return [
    createWeapon('railGun', 'Rail gun', 1, 900, 18, true, 0, -10, 76),
    createWeapon('machineGun', 'Machine gun', 0, 1200, 5, false, -38, 0, 58),
    createWeapon('missileLauncher', 'Missile launcher', 0, 2600, 40, false, 48, 0, 52),
    createWeapon('lightningGun', 'Lightning gun', 0, 2000, 25, false, -86, 14, 66),
    //createWeapon('droneLauncher', 'Drone launcher', 0, 2200, 8, false, 74, -14, 42),
  ];
}
