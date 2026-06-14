import { Howl } from 'howler';

const explosionRumbleUrl = new URL(
    './assets/sound/EXPLDsgn_Explosion Rumble Distorted_01.wav',
    import.meta.url,
).href;

const explosionImpactUrl = new URL(
    './assets/sound/EXPLDsgn_Explosion Impact_14.wav',
    import.meta.url,
).href;

const lasrgunURL = new URL('./assets/sound/LASRGun_Particle Compressor Fire_01.wav', import.meta.url).href;

const shotgun = new URL('./assets/sound/GUNTech_Sci Fi Shotgun Fire_04.wav', import.meta.url).href;

const missileLaunch = new URL('./assets/sound/agapites_plc-big-spaceship-missile-1-356318.mp3', import.meta.url).href;

const eletricShock = new URL('./assets/sound/MAGElem_LightningStrikeSolo_HoveAud_LightningMagic_21.wav', import.meta.url).href;

export const sfx = {
    explosion: new Howl({
        src: [explosionRumbleUrl],
        volume: 0.4,
        rate: 1.5,
    }),
    explosionImpact: new Howl({
        src: [explosionImpactUrl],
        volume: 0.4,
        rate: 1.5,
    }),
    lasrgun: new Howl({
        src: [lasrgunURL],
        volume: 0.4,
        rate: 1.0,
    }),
    shotgun: new Howl({
        src: [shotgun],
        volume: 0.4,
        rate: 1.0,
    }),
    missileLaunch: new Howl({
        src: [missileLaunch],
        volume: 0.3,
        rate: 1.5,
    }),
    electricShock: new Howl({
        src: [eletricShock],
        volume: 0.9,
        rate: 0.9,
    }),
    explosionPool: Array.from({ length: 8 }, () =>
        new Howl({
            src: [explosionImpactUrl],
            volume: 0.4,
            rate: 1.5,
        }),
    ),
};
