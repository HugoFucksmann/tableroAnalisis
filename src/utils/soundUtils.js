
const SOUNDS = {
  move: 'https://lichess1.org/assets/sound/standard/Move.ogg',
  capture: 'https://lichess1.org/assets/sound/standard/Capture.ogg',
  check: 'https://lichess1.org/assets/sound/standard/Check.ogg',
  notify: 'https://lichess1.org/assets/sound/standard/GenericNotify.ogg',
};

const audioCache = {};

export const playChessSound = (type) => {
  try {
    const url = SOUNDS[type];
    if (!url) return;

    if (!audioCache[type]) {
      audioCache[type] = new Audio(url);
    }

    const audio = audioCache[type];
    audio.currentTime = 0;
    audio.play().catch(e => {

      console.warn('Audio play blocked or failed', e);
    });
  } catch (err) {
    console.error('Error playing sound:', err);
  }
};
