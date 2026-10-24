// Per-level audio schema: the ambient drone (a handful of detuned voices,
// each with its own frequency/waveform/gain), plus tempo-driven percussion
// and the shared delay/reverb sends. Lives in the level JSON under "audio"
// so each moon/mine can have its own soundscape; the level editor's drone
// panel edits this data directly, with a live preview via src/audio/soundfx.js.
export const WAVEFORM_TYPES = ['sine', 'triangle', 'sawtooth', 'square'];
export const MIN_DRONE_VOICES = 1;
export const MAX_DRONE_VOICES = 6;

export const DEFAULT_AUDIO = {
  droneVoices: [
    { freq: 55, type: 'triangle', gain: 0.045 },
    { freq: 82.5, type: 'sawtooth', gain: 0.057 },
    { freq: 110, type: 'triangle', gain: 0.069 },
    { freq: 277.18, type: 'triangle', gain: 0.081 }
  ],
  tempo: 15,       // bpm — drives both percussive intervals below
  hihatBeats: 1,   // hi-hat fires roughly every N beats (humanized, not exact)
  bassBeats: 3,    // bass drum fires roughly every N beats
  delayTime: 0.44,
  delayFeedback: 0.48,
  reverbWet: 0.38
};

// Field metadata for the editor's generic slider/number rows — everything
// here except droneVoices (which gets its own add/remove list UI).
export const AUDIO_FIELDS = [
  { key: 'tempo', label: 'Tempo', min: 4, max: 60, step: 1, unit: 'bpm' },
  { key: 'hihatBeats', label: 'Hi-hat Every', min: 1, max: 16, step: 1, unit: 'beats' },
  { key: 'bassBeats', label: 'Bass Every', min: 1, max: 24, step: 1, unit: 'beats' },
  { key: 'delayTime', label: 'Echo Spacing', min: 0.05, max: 1, step: 0.01, unit: 's' },
  { key: 'delayFeedback', label: 'Echo Repeats', min: 0, max: 0.85, step: 0.01, unit: '' },
  { key: 'reverbWet', label: 'Reverb Amount', min: 0, max: 0.8, step: 0.01, unit: '' }
];

export const DRONE_VOICE_FIELDS = {
  freq: { min: 20, max: 1000, step: 0.1 },
  gain: { min: 0, max: 0.2, step: 0.001 }
};

export function cloneDefaultAudio(){
  return JSON.parse(JSON.stringify(DEFAULT_AUDIO));
}

// Merges a level's (possibly partial, possibly absent) "audio" block over
// the defaults, so old level files with no audio data at all still sound
// exactly like they used to.
export function mergeAudioConfig(levelAudio){
  const base = cloneDefaultAudio();
  if (!levelAudio) return base;
  const voices = Array.isArray(levelAudio.droneVoices) && levelAudio.droneVoices.length
    ? levelAudio.droneVoices.map((v) => ({
      freq: typeof v.freq === 'number' ? v.freq : 110,
      type: WAVEFORM_TYPES.includes(v.type) ? v.type : 'sine',
      gain: typeof v.gain === 'number' ? v.gain : 0.05
    }))
    : base.droneVoices;
  return { ...base, ...levelAudio, droneVoices: voices };
}
