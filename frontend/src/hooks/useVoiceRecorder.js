import { useState, useRef, useCallback } from 'react';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState('idle'); // 'live_mic' or 'synthetic'
  const [metrics, setMetrics] = useState({
    pitch: 0,
    centroid: 0,
    rms: 0,
    zcr: 0
  });

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animFrameRef = useRef(null);

  const pitchBuffer = useRef([]);
  const centroidBuffer = useRef([]);
  const rmsBuffer = useRef([]);
  const zcrBuffer = useRef([]);

  const onFrameCallbackRef = useRef(null);

  const startListening = useCallback(async (onFrame) => {
    onFrameCallbackRef.current = onFrame;
    pitchBuffer.current = [];
    centroidBuffer.current = [];
    rmsBuffer.current = [];
    zcrBuffer.current = [];

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }

      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      mediaStreamRef.current = stream;

      sourceNodeRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      sourceNodeRef.current.connect(analyserRef.current);
      setIsRecording(true);
      setMode('live_mic');

      const processAudio = () => {
        if (!analyserRef.current) return;
        const bufferLength = analyserRef.current.fftSize;
        const timeData = new Float32Array(bufferLength);
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);

        analyserRef.current.getFloatTimeDomainData(timeData);
        analyserRef.current.getByteFrequencyData(freqData);

        const rms = calculateRMS(timeData);
        const zcr = calculateZCR(timeData);
        const pitch = detectPitch(timeData, audioCtxRef.current.sampleRate);
        const centroid = calculateSpectralCentroid(freqData, audioCtxRef.current.sampleRate);

        if (rms > 0.015) {
          if (pitch > 60 && pitch < 450) pitchBuffer.current.push(pitch);
          centroidBuffer.current.push(centroid);
          rmsBuffer.current.push(rms);
          zcrBuffer.current.push(zcr);

          setMetrics({
            pitch: Math.round(pitch),
            centroid: Math.round(centroid),
            rms: parseFloat(rms.toFixed(3)),
            zcr: parseFloat(zcr.toFixed(3))
          });
        }

        if (onFrameCallbackRef.current) {
          onFrameCallbackRef.current({ timeData, freqData, rms, zcr, pitch, centroid });
        }

        animFrameRef.current = requestAnimationFrame(processAudio);
      };

      processAudio();
      return { success: true, mode: 'live_mic' };
    } catch (err) {
      console.warn('Microphone unavailable, switching to synthetic DSP:', err);
      setIsRecording(true);
      setMode('synthetic');

      const processSynthetic = () => {
        const bufferLength = 1024;
        const timeData = new Float32Array(bufferLength);
        const freqData = new Uint8Array(512);

        const now = performance.now() * 0.005;
        const baseFreq = 150 + Math.sin(now * 0.8) * 15;

        for (let i = 0; i < bufferLength; i++) {
          const t = i / 44100;
          timeData[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.35 + (Math.random() - 0.5) * 0.04;
        }

        for (let i = 0; i < 512; i++) {
          const harmonicDist = Math.abs((i * 44100 / 1024) - baseFreq);
          freqData[i] = Math.max(0, 200 - harmonicDist * 0.3) + Math.random() * 20;
        }

        const rms = 0.22;
        const zcr = 0.09;
        const centroid = 1680 + Math.sin(now) * 80;

        pitchBuffer.current.push(baseFreq);
        centroidBuffer.current.push(centroid);
        rmsBuffer.current.push(rms);
        zcrBuffer.current.push(zcr);

        setMetrics({
          pitch: Math.round(baseFreq),
          centroid: Math.round(centroid),
          rms: 0.22,
          zcr: 0.09
        });

        if (onFrameCallbackRef.current) {
          onFrameCallbackRef.current({ timeData, freqData, rms, zcr, pitch: baseFreq, centroid });
        }

        animFrameRef.current = requestAnimationFrame(processSynthetic);
      };

      processSynthetic();
      return { success: true, mode: 'synthetic' };
    }
  }, []);

  const stopListening = useCallback(() => {
    setIsRecording(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const std = (arr, m) => {
      if (arr.length <= 1) return 12;
      const v = arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1);
      return Math.sqrt(v);
    };

    const pitchMean = mean(pitchBuffer.current) || 140;
    const pitchStd = std(pitchBuffer.current, pitchMean) || 15;
    const centroidMean = mean(centroidBuffer.current) || 1650;
    const rmsMean = mean(rmsBuffer.current) || 0.18;
    const zcrMean = mean(zcrBuffer.current) || 0.085;

    return {
      pitch_mean: Math.round(pitchMean),
      pitch_std: Math.round(pitchStd),
      centroid_mean: Math.round(centroidMean),
      rms_mean: parseFloat(rmsMean.toFixed(3)),
      zcr_mean: parseFloat(zcrMean.toFixed(3)),
      sample_count: pitchBuffer.current.length
    };
  }, []);

  return {
    isRecording,
    mode,
    metrics,
    startListening,
    stopListening
  };
}

function calculateRMS(signal) {
  let sum = 0;
  for (let i = 0; i < signal.length; i++) sum += signal[i] * signal[i];
  return Math.sqrt(sum / signal.length);
}

function calculateZCR(signal) {
  let crossings = 0;
  for (let i = 1; i < signal.length; i++) {
    if ((signal[i] >= 0 && signal[i - 1] < 0) || (signal[i] < 0 && signal[i - 1] >= 0)) crossings++;
  }
  return crossings / signal.length;
}

function detectPitch(signal, sampleRate) {
  const SIZE = signal.length;
  let r = new Float32Array(SIZE);
  for (let lag = 0; lag < SIZE; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE - lag; i++) sum += signal[i] * signal[i + lag];
    r[lag] = sum;
  }
  let d = 0;
  while (d < SIZE - 1 && r[d] > r[d + 1]) d++;
  let maxVal = -1, maxLag = -1;
  for (let i = d; i < SIZE; i++) {
    if (r[i] > maxVal) {
      maxVal = r[i];
      maxLag = i;
    }
  }
  return (maxLag > 0 && maxVal > 0.01) ? (sampleRate / maxLag) : 0;
}

function calculateSpectralCentroid(freqData, sampleRate) {
  let num = 0, den = 0;
  const binWidth = (sampleRate / 2) / freqData.length;
  for (let i = 0; i < freqData.length; i++) {
    const freq = i * binWidth;
    num += freq * freqData[i];
    den += freqData[i];
  }
  return den > 0 ? (num / den) : 0;
}
