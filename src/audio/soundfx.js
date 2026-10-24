// All audio is synthesized at runtime via the Web Audio API — no sound files.
import { mergeAudioConfig } from './audioConfig.js';

export class SoundFX {
  constructor(){
    this.ctx = null;
    this.noiseNodes = {};
    this.droneVoiceNodes = [];
    this.audio = mergeAudioConfig(null);
  }

  init(audioConfig){
    this.audio = mergeAudioConfig(audioConfig);
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this._makeNoise();
    this._setupReverbBus();
    this._setupDelayBus();
    this._startDrone();
    this._startStaticPulse();
    this._startBassPulse();
  }

  // Re-applies a (possibly new) config to an already-running preview — used
  // by the level editor when a different level is loaded while audio
  // preview is already on. No-ops until init() has actually built the graph.
  applyAudioConfig(audioConfig){
    this.audio = mergeAudioConfig(audioConfig);
    if (!this.ctx) return;
    this.setDroneVoiceCount(this.audio.droneVoices.length);
    this.audio.droneVoices.forEach((v, i) => {
      this.setDroneVoiceParam(i, 'freq', v.freq);
      this.setDroneVoiceParam(i, 'type', v.type);
      this.setDroneVoiceParam(i, 'gain', v.gain);
    });
    this.setDelay({ time: this.audio.delayTime, feedback: this.audio.delayFeedback });
    this.setReverbWet(this.audio.reverbWet);
  }

  // A long convolution reverb, built from a synthesized impulse response
  // (exponentially-decaying noise — there's no audio file to load from, so
  // this is the standard way to fake a big space). `reverbSend` is the
  // shared send bus: everything connects into it alongside its normal dry
  // output, so the whole mix — drone, pulses, thrusters, every blip —
  // shares one big, cavernous tail instead of each sound having its own.
  _setupReverbBus(){
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._makeImpulseResponse(3.5, 3.2);

    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = this.audio.reverbWet;
    this.reverb.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.master);

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.connect(this.reverb);
  }

  setReverbWet(value){
    if (!this.ctx) return;
    this.reverbWetGain.gain.setValueAtTime(value, this.ctx.currentTime);
    this.audio.reverbWet = value;
  }

  _makeImpulseResponse(duration, decay){
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++){
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++){
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  // A shared feedback-delay send: anything that connects into `delayNode`
  // gets echoed back repeatedly, each repeat a little quieter and a little
  // darker than the last (the lowpass in the feedback loop), like a real
  // cave reflection losing energy and high end with distance.
  _setupDelayBus(){
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = this.audio.delayTime;

    const feedbackFilter = this.ctx.createBiquadFilter();
    feedbackFilter.type = 'lowpass';
    feedbackFilter.frequency.value = 3200;

    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.value = this.audio.delayFeedback;

    this.delayNode.connect(feedbackFilter);
    feedbackFilter.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    const wet = this.ctx.createGain();
    wet.gain.value = 0.6;
    this.delayNode.connect(wet);
    wet.connect(this.master);
  }

  setDelay({ time, feedback }){
    if (!this.ctx) return;
    if (time !== undefined){
      this.delayNode.delayTime.setValueAtTime(time, this.ctx.currentTime);
      this.audio.delayTime = time;
    }
    if (feedback !== undefined){
      this.delayFeedbackGain.gain.setValueAtTime(feedback, this.ctx.currentTime);
      this.audio.delayFeedback = feedback;
    }
  }

  _makeNoise(){
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _createDroneVoice(index, cfg){
    const osc = this.ctx.createOscillator();
    osc.type = cfg.type;
    osc.frequency.value = cfg.freq;
    const gain = this.ctx.createGain();
    gain.gain.value = cfg.gain;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900 / (index + 1);
    osc.connect(filter); filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverbSend);
    osc.start();
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05 + index * 0.01;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 130;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start();
    return { osc, gain, filter, lfo, lfoGain };
  }

  _stopDroneVoice(v){
    try { v.osc.stop(); } catch (e){ /* already stopped */ }
    try { v.lfo.stop(); } catch (e){ /* already stopped */ }
  }

  _startDrone(){
    this.droneVoiceNodes = this.audio.droneVoices.map((cfg, i) => this._createDroneVoice(i, cfg));
  }

  // Adds/removes oscillator voices to match a new count — the only drone
  // operation that needs new nodes; frequency/type/gain tweak existing ones
  // in place (see setDroneVoiceParam) so dragging a slider never clicks.
  setDroneVoiceCount(n){
    if (!this.ctx) { this.audio.droneVoices.length = n; return; }
    while (this.droneVoiceNodes.length < n){
      const i = this.droneVoiceNodes.length;
      const cfg = this.audio.droneVoices[i] || { freq: 110, type: 'sine', gain: 0.05 };
      this.audio.droneVoices[i] = cfg;
      this.droneVoiceNodes.push(this._createDroneVoice(i, cfg));
    }
    while (this.droneVoiceNodes.length > n){
      this._stopDroneVoice(this.droneVoiceNodes.pop());
      this.audio.droneVoices.pop();
    }
  }

  setDroneVoiceParam(i, key, value){
    const v = this.droneVoiceNodes[i];
    if (!this.audio.droneVoices[i]) return;
    this.audio.droneVoices[i][key] = value;
    if (!v || !this.ctx) return;
    if (key === 'freq') v.osc.frequency.setValueAtTime(value, this.ctx.currentTime);
    else if (key === 'type') v.osc.type = value;
    else if (key === 'gain') v.gain.gain.setValueAtTime(value, this.ctx.currentTime);
  }

  // A slow, loosely-rhythmic tick of bright filtered noise under the drone —
  // percussive and hi-hat-like (fast attack, quick decay), not a continuous
  // bed with a smooth swell (that read as "wavey"/oceanic instead).
  _hihatTick(){
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.025); // softer onset, no hard click
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); // longer tail, more "tss" than "tick"
    src.connect(filter); filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.delayNode);
    gain.connect(this.reverbSend);
    src.start(t); src.stop(t + 0.25);
  }

  // Both percussive loops read tempo/beat-spacing fresh off `this.audio`
  // each time they schedule the next hit, so editing those live (or loading
  // a different level's config) changes the rhythm starting next hit,
  // without needing to tear down and restart the timers.
  _nextPercussiveDelayMs(beats){
    const beatSec = 60 / Math.max(1, this.audio.tempo);
    const base = beatSec * Math.max(1, beats);
    return (base * 0.8 + Math.random() * base * 0.4) * 1000; // ±20% humanize
  }

  _startStaticPulse(){
    const scheduleNext = () => {
      this._hihatTick();
      this._staticTimer = setTimeout(scheduleNext, this._nextPercussiveDelayMs(this.audio.hihatBeats));
    };
    scheduleNext();
  }

  // A deep sub-bass thump, tuned to 55Hz (the drone's lowest voice) so it
  // locks in harmonically instead of just adding noise. Hard-lowpassed so
  // there's no click in it at all — meant to be felt more than heard. Runs
  // on its own sparse, independent schedule so it occasionally coincides
  // with a hi-hat tick and occasionally lands alone.
  _bassDrum(){
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.08); // pitch drops and settles in tune

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc.connect(filter); filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.delayNode);
    gain.connect(this.reverbSend);
    osc.start(t); osc.stop(t + 0.5);
  }

  _startBassPulse(){
    const scheduleNext = () => {
      this._bassDrum();
      this._bassTimer = setTimeout(scheduleNext, this._nextPercussiveDelayMs(this.audio.bassBeats));
    };
    this._bassTimer = setTimeout(scheduleNext, this._nextPercussiveDelayMs(this.audio.bassBeats) * 0.4);
  }

  blip(f0, f1, dur, type = 'sine', vol = 0.2){
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverbSend);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  pickup(){ this.blip(640, 1180, 0.14, 'triangle', 0.22); }

  refuel(){ this.blip(300, 520, 0.16, 'sawtooth', 0.18); }

  deliver(){
    [0, 1, 2].forEach((i) => setTimeout(() => this.blip(520 + i * 180, 560 + i * 180, 0.16, 'sine', 0.2), i * 90));
  }

  victory(){
    [0, 1, 2, 3, 4].forEach((i) => setTimeout(() => this.blip(440 + i * 140, 500 + i * 140, 0.22, 'triangle', 0.22), i * 110));
  }

  crash(){
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(90, t + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(filter); filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverbSend);
    src.start(t); src.stop(t + 0.5);
    this.blip(180, 40, 0.4, 'sine', 0.3);
  }

  // Shared engine for any sustained noise-loop thruster sound (main engine,
  // RCS puffs) — keyed so several can run independently at once.
  _noiseLoopStart(key, { freq, q, peakGain }){
    if (!this.ctx || this.noiseNodes[key]) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    src.connect(filter); filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverbSend);
    src.start();
    gain.gain.exponentialRampToValueAtTime(peakGain, this.ctx.currentTime + 0.06);
    this.noiseNodes[key] = { src, gain };
  }

  _noiseLoopStop(key){
    const node = this.noiseNodes[key];
    if (!node) return;
    const t = this.ctx.currentTime;
    node.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    setTimeout(() => { try { node.src.stop(); } catch (e) { /* already stopped */ } }, 180);
    delete this.noiseNodes[key];
  }

  thrustStart(){ this._noiseLoopStart('main', { freq: 420, q: 0.8, peakGain: 0.22 }); }
  thrustStop(){ this._noiseLoopStop('main'); }

  // RCS puffs: quieter and higher-pitched/narrower than the main engine, so
  // they read as small side thrusters rather than a second main engine.
  rcsStart(side){ this._noiseLoopStart('rcs-' + side, { freq: 900, q: 2.2, peakGain: 0.09 }); }
  rcsStop(side){ this._noiseLoopStop('rcs-' + side); }

  stopAllThrust(){
    Object.keys(this.noiseNodes).forEach((key) => this._noiseLoopStop(key));
  }

  // One-off manual triggers for the level editor's "Test" buttons.
  previewHihat(){ this._hihatTick(); }
  previewBass(){ this._bassDrum(); }

  lowFuel(){ this.blip(880, 860, 0.08, 'square', 0.12); }

  thud(){ this.blip(140, 70, 0.12, 'square', 0.2); }

  minerLost(){ this.blip(260, 50, 0.5, 'sine', 0.22); }
}

export const sfx = new SoundFX();
