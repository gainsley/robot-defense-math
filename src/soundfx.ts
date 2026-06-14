import { Howl } from 'howler';


function loadsfx(file: string): string {
    return new URL('./assets/sound/' + file, import.meta.url).href;
}

const explosionRumbleUrl = loadsfx('EXPLDsgn_Explosion Rumble Distorted_01.wav');
const explosionImpactUrl = loadsfx('./assets/sound/EXPLDsgn_Explosion Impact_14.wav');
const lasrgunURL = loadsfx('LASRGun_Particle Compressor Fire_01.wav');
const shotgun = loadsfx('GUNTech_Sci Fi Shotgun Fire_04.wav');
const missileLaunch = loadsfx('agapites_plc-big-spaceship-missile-1-356318.mp3');
const eletricShock = loadsfx('MAGElem_LightningStrikeSolo_HoveAud_LightningMagic_21.wav');
const oneShotCinema = loadsfx('ONE_SHOT_CINEMATIC_EFFECT_10.wav');
const frenzy = loadsfx('scifi04-device1.flac');
const errtriplet = loadsfx('Error Triplet-5.wav');

function createSoundPool(src: string, size: number = 1, defaultVolume: number = 1.0) {
    const pool = Array.from(
        { length: size },
        () =>
            new Howl({
                src: [src],
                volume: defaultVolume,
            })
    );

    let index = 0;

    return {
        play(options?: { rate?: number; volume?: number }) {
            const sound = pool[index];
            index = (index + 1) % pool.length;

            sound.stop(); // optional: prevents reused instance from overlapping itself

            sound.rate(options?.rate ?? 1);
            sound.volume(options?.volume ?? defaultVolume);
            sound.play();
        },
    };

}

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
    oneShotCinema: new Howl({
        src: [oneShotCinema],
        volume: 0.9,
        rate: 0.9,
    }),
    frenzy: new Howl({
        src: [frenzy],
        volume: 0.5,
        rate: 1.0,
    }),
    errtriplet: new Howl({
        src: [errtriplet],
        volume: 1.0,
        rate: 1.0,
    }),
    explosionPool: createSoundPool(explosionImpactUrl, 8, 0.4),
    lasrgunPool: createSoundPool(lasrgunURL, 3, 0.4),
};
