// All audio is synthesized at runtime via the Web Audio API — no sound files.
export class SoundFX {
  constructor(){
    this.ctx = null;
    this.noiseNodes = {};
  }

  init(){
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

  // A long convolution reverb, built from a synthesized impulse response
  // (exponentially-decaying noise — there's no audio file to load from, so
  // this is the standard way to fake a big space). `reverbSend` is the
  // shared send bus: everything connects into it alongside its normal dry
  // output, so the whole mix — drone, pulses, thrusters, every blip —
  // shares one big, cavernous tail instead of each sound having its own.
  _setupReverbBus(){
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._makeImpulseResponse(3.5, 3.2);

    const wet = this.ctx.createGain();
    wet.gain.value = 0.38;
    this.reverb.connect(wet);
    wet.connect(this.master);

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.connect(this.reverb);
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
    this.delayNode.delayTime.value = 0.44;

    const feedbackFilter = this.ctx.createBiquadFilter();
    feedbackFilter.type = 'lowpass';
    feedbackFilter.frequency.value = 3200;

    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.48;

    this.delayNode.connect(feedbackFilter);
    feedbackFilter.connect(feedback);
    feedback.connect(this.delayNode);

    const wet = this.ctx.createGain();
    wet.gain.value = 0.6;
    this.delayNode.connect(wet);
    wet.connect(this.master);
  }

  _makeNoise(){
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _startDrone(){
    [55, 82.5, 110, 277.18].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.value = f;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.045 + i * 0.012;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900 / (i+1);
      osc.connect(filter); filter.connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverbSend);
      osc.start();
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.01;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 130;
      lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
      lfo.start();
    });
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

  _startStaticPulse(){
    const scheduleNext = () => {
      this._hihatTick();
      this._staticTimer = setTimeout(scheduleNext, 3500 + Math.random() * 3000);
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
      this._bassTimer = setTimeout(scheduleNext, 9000 + Math.random() * 7000);
    };
    this._bassTimer = setTimeout(scheduleNext, 4000 + Math.random() * 4000);
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

  lowFuel(){ this.blip(880, 860, 0.08, 'square', 0.12); }

  thud(){ this.blip(140, 70, 0.12, 'square', 0.2); }

  minerLost(){ this.blip(260, 50, 0.5, 'sine', 0.22); }
}

export const sfx = new SoundFX();
