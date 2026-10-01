/**
 * AEGIS - Voice Biometrics & Acoustic Signal Analysis Engine
 * Uses Web Audio API for real-time acoustic feature extraction:
 * - Fundamental Frequency (F0 / Pitch) via time-domain Autocorrelation
 * - Spectral Centroid (Timbre Brightness)
 * - Root-Mean-Square (RMS / Energy)
 * - Zero-Crossing Rate (ZCR)
 * Includes realistic simulated acoustic profiles for testing & demo purposes.
 */

class VoiceEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.isRecording = false;
    this.capturedFrames = [];
    this.animationId = null;

    // Feature buffers
    this.pitchBuffer = [];
    this.centroidBuffer = [];
    this.rmsBuffer = [];
    this.zcrBuffer = [];

    this.onFrameCallback = null;
  }

  async startListening(onFrame) {
    this.onFrameCallback = onFrame;
    this.reset();

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode.connect(this.analyser);
      this.isRecording = true;

      this._processAudioLoop();
      return { success: true, mode: 'live_mic' };
    } catch (err) {
      console.warn('Microphone access unavailable or denied. Falling back to synthetic biometric simulator:', err.message);
      this.isRecording = true;
      this._processSyntheticLoop();
      return { success: true, mode: 'synthetic_simulation', reason: err.message };
    }
  }

  stopListening() {
    this.isRecording = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    return this.getAcousticProfile();
  }

  reset() {
    this.capturedFrames = [];
    this.pitchBuffer = [];
    this.centroidBuffer = [];
    this.rmsBuffer = [];
    this.zcrBuffer = [];
  }

  _processAudioLoop() {
    if (!this.isRecording || !this.analyser) return;

    const bufferLength = this.analyser.fftSize;
    const timeData = new Float32Array(bufferLength);
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);

    this.analyser.getFloatTimeDomainData(timeData);
    this.analyser.getByteFrequencyData(freqData);

    // Extract frame features
    const rms = this._calculateRMS(timeData);
    const zcr = this._calculateZCR(timeData);
    const pitch = this._detectPitch(timeData, this.audioCtx.sampleRate);
    const spectralCentroid = this._calculateSpectralCentroid(freqData, this.audioCtx.sampleRate);

    // Voice activity detection (VAD): only collect when speaking above silence threshold
    if (rms > 0.015) {
      if (pitch > 60 && pitch < 450) this.pitchBuffer.push(pitch);
      this.centroidBuffer.push(spectralCentroid);
      this.rmsBuffer.push(rms);
      this.zcrBuffer.push(zcr);
    }

    if (this.onFrameCallback) {
      this.onFrameCallback({
        timeData,
        freqData,
        rms,
        zcr,
        pitch,
        spectralCentroid,
        isVoiced: rms > 0.015
      });
    }

    this.animationId = requestAnimationFrame(() => this._processAudioLoop());
  }

  _processSyntheticLoop() {
    if (!this.isRecording) return;

    const bufferLength = 1024;
    const timeData = new Float32Array(bufferLength);
    const freqData = new Uint8Array(512);

    const now = performance.now() * 0.005;
    const baseFreq = 145 + Math.sin(now * 0.8) * 12; // Natural pitch drift

    for (let i = 0; i < bufferLength; i++) {
      const t = i / 44100;
      timeData[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.35 +
                    Math.sin(4 * Math.PI * baseFreq * t) * 0.18 +
                    (Math.random() - 0.5) * 0.04;
    }

    for (let i = 0; i < 512; i++) {
      const harmonicDist = Math.abs((i * 44100 / 1024) - baseFreq);
      freqData[i] = Math.max(0, 200 - harmonicDist * 0.3) + Math.random() * 20;
    }

    const rms = 0.22 + Math.sin(now) * 0.05;
    const zcr = 0.09;
    const pitch = baseFreq;
    const spectralCentroid = 1680 + Math.sin(now) * 80;

    this.pitchBuffer.push(pitch);
    this.centroidBuffer.push(spectralCentroid);
    this.rmsBuffer.push(rms);
    this.zcrBuffer.push(zcr);

    if (this.onFrameCallback) {
      this.onFrameCallback({
        timeData,
        freqData,
        rms,
        zcr,
        pitch,
        spectralCentroid,
        isVoiced: true
      });
    }

    this.animationId = requestAnimationFrame(() => this._processSyntheticLoop());
  }

  getAcousticProfile() {
    const pitchMean = this._mean(this.pitchBuffer) || 140;
    const pitchStd = this._std(this.pitchBuffer, pitchMean) || 18;
    const centroidMean = this._mean(this.centroidBuffer) || 1650;
    const rmsMean = this._mean(this.rmsBuffer) || 0.18;
    const zcrMean = this._mean(this.zcrBuffer) || 0.085;

    return {
      pitchMean: Math.round(pitchMean),
      pitchStd: Math.round(pitchStd),
      centroidMean: Math.round(centroidMean),
      rmsMean: parseFloat(rmsMean.toFixed(3)),
      zcrMean: parseFloat(zcrMean.toFixed(3)),
      sampleCount: this.pitchBuffer.length
    };
  }

  /**
   * Compare audio sample against enrolled acoustic profile
   */
  computeAnomaly(sampleProfile, baselineProfile) {
    if (!sampleProfile || !baselineProfile) {
      return { anomalyScore: 0, details: {} };
    }

    const pitchDelta = Math.abs(sampleProfile.pitchMean - baselineProfile.pitchMean);
    const pitchZ = pitchDelta / (baselineProfile.pitchStd + 12);

    const centroidDelta = Math.abs(sampleProfile.centroidMean - baselineProfile.centroidMean);
    const centroidZ = centroidDelta / 280;

    const zcrDelta = Math.abs(sampleProfile.zcrMean - baselineProfile.zcrMean);
    const zcrZ = zcrDelta / 0.035;

    const compositeVoiceZ = 0.50 * pitchZ + 0.35 * centroidZ + 0.15 * zcrZ;
    let anomalyScore = 1 - Math.exp(-compositeVoiceZ * 0.45);
    anomalyScore = Math.min(Math.max(anomalyScore, 0.0), 1.0);

    return {
      anomalyScore: parseFloat(anomalyScore.toFixed(3)),
      details: {
        pitchDelta: Math.round(pitchDelta),
        centroidDelta: Math.round(centroidDelta),
        pitchZ: parseFloat(pitchZ.toFixed(2)),
        centroidZ: parseFloat(centroidZ.toFixed(2)),
        compositeVoiceZ: parseFloat(compositeVoiceZ.toFixed(2))
      }
    };
  }

  // --- Acoustic Signal Math Helpers ---

  _calculateRMS(signal) {
    let sum = 0;
    for (let i = 0; i < signal.length; i++) {
      sum += signal[i] * signal[i];
    }
    return Math.sqrt(sum / signal.length);
  }

  _calculateZCR(signal) {
    let crossings = 0;
    for (let i = 1; i < signal.length; i++) {
      if ((signal[i] >= 0 && signal[i - 1] < 0) || (signal[i] < 0 && signal[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / signal.length;
  }

  _detectPitch(signal, sampleRate) {
    // Autocorrelation Pitch Detection
    const SIZE = signal.length;
    let r = new Float32Array(SIZE);

    for (let lag = 0; lag < SIZE; lag++) {
      let sum = 0;
      for (let i = 0; i < SIZE - lag; i++) {
        sum += signal[i] * signal[i + lag];
      }
      r[lag] = sum;
    }

    // Find the first dip
    let d = 0;
    while (d < SIZE - 1 && r[d] > r[d + 1]) d++;

    // Find the maximum peak after the dip
    let maxVal = -1;
    let maxLag = -1;
    for (let i = d; i < SIZE; i++) {
      if (r[i] > maxVal) {
        maxVal = r[i];
        maxLag = i;
      }
    }

    if (maxLag > 0 && maxVal > 0.01) {
      const pitch = sampleRate / maxLag;
      return pitch;
    }
    return 0;
  }

  _calculateSpectralCentroid(freqData, sampleRate) {
    let numerator = 0;
    let denominator = 0;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / freqData.length;

    for (let i = 0; i < freqData.length; i++) {
      const freq = i * binWidth;
      const magnitude = freqData[i];
      numerator += freq * magnitude;
      denominator += magnitude;
    }

    return denominator > 0 ? (numerator / denominator) : 0;
  }

  _mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  _std(arr, mean) {
    if (arr.length <= 1) return 10;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }
}

if (typeof module !== 'undefined') module.exports = VoiceEngine;
if (typeof window !== 'undefined') window.VoiceEngine = VoiceEngine;
