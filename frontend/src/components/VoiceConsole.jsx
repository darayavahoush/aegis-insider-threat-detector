import React, { useRef, useEffect } from 'react';
import { Mic, Volume2, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function VoiceConsole({
  recorder,
  activeProfile,
  voiceAnomaly,
  onSimulateValid,
  onSimulateSpoof
}) {
  const waveformCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);

  // Real-time canvas renderers
  const handleAudioFrame = ({ timeData, freqData }) => {
    // Waveform
    const wCanvas = waveformCanvasRef.current;
    if (wCanvas && timeData) {
      const ctx = wCanvas.getContext('2d');
      const width = wCanvas.width;
      const height = wCanvas.height;

      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = width / timeData.length;
      let x = 0;
      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i];
        const y = ((v + 1) / 2) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    }

    // Spectrum
    const sCanvas = spectrumCanvasRef.current;
    if (sCanvas && freqData) {
      const ctx = sCanvas.getContext('2d');
      const width = sCanvas.width;
      const height = sCanvas.height;

      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = width / barCount - 2;
      const step = Math.floor(freqData.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * step] / 255;
        const barHeight = val * (height - 10);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#00f0ff');
        grad.addColorStop(0.7, '#38bdf8');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }
  };

  const toggleRecording = async () => {
    if (!recorder.isRecording) {
      await recorder.startListening(handleAudioFrame);
    } else {
      recorder.stopListening();
    }
  };

  const vBase = activeProfile?.voice_baseline || { pitch_mean: 195, centroid_mean: 1740 };
  const percent = voiceAnomaly !== null ? voiceAnomaly : 0;
  const isSpoof = percent >= 50;

  return (
    <div className="grid-2">
      {/* Left: Audio Capture Console */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Mic size={18} /> Voice Acoustic Verification & Live Spectrum
          </div>
          <span className="card-tag">
            {recorder.mode === 'live_mic'
              ? 'LIVE MIC STREAM'
              : recorder.mode === 'synthetic'
              ? 'SYNTHETIC DSP'
              : 'WEB AUDIO API'}
          </span>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Aegis captures vocal tract resonances: <strong>Fundamental Frequency ($F_0$)</strong>,{' '}
          <strong>Spectral Centroid</strong> (timbre brightness), and <strong>Zero-Crossing Rate (ZCR)</strong> to verify
          authorized identity.
        </p>

        <div className="sample-text-guide" style={{ marginBottom: '1.25rem' }}>
          <strong>🗣️ Spoken Passphrase Prompt:</strong>
          <p style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            "My voice is my credential, authenticate security clearance level four."
          </p>
        </div>

        <div className="mic-control-box">
          <div
            className={`mic-btn-circle ${recorder.isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            title={recorder.isRecording ? 'Click to stop' : 'Click to record'}
          >
            <Mic size={32} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {recorder.isRecording ? 'Recording... Speak Passphrase Now' : 'Click to Start Audio Capture'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Speak the passphrase for 3-5 seconds to evaluate voice biometrics.
          </div>
        </div>

        {/* Waveform Canvas */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            TIME-DOMAIN WAVEFORM (OSCILLOSCOPE)
          </div>
          <div className="canvas-wrapper">
            <canvas ref={waveformCanvasRef} width={600} height={110} />
          </div>
        </div>

        {/* Spectrum Canvas */}
        <div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            FAST FOURIER TRANSFORM (FFT) FREQUENCY SPECTRUM
          </div>
          <div className="canvas-wrapper">
            <canvas ref={spectrumCanvasRef} width={600} height={110} />
          </div>
        </div>
      </div>

      {/* Right: Acoustic Parameters & Verification Matching */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Volume2 size={18} /> Extracted Acoustic Parameters
            </div>
            <span className="card-tag">AUTOCORRELATION & DSP</span>
          </div>

          <div className="metric-row">
            <span className="metric-label">Fundamental Pitch ($F_0$):</span>
            <span className="metric-value">{recorder.metrics.pitch ? `${recorder.metrics.pitch} Hz` : '-- Hz'}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Enrolled Baseline Pitch:</span>
            <span className="metric-value">{vBase.pitch_mean} Hz (±{vBase.pitch_std || 20} Hz)</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Spectral Centroid:</span>
            <span className="metric-value">{recorder.metrics.centroid ? `${recorder.metrics.centroid} Hz` : '-- Hz'}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Enrolled Spectral Centroid:</span>
            <span className="metric-value">{vBase.centroid_mean} Hz</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Voice Energy (RMS):</span>
            <span className="metric-value">{recorder.metrics.rms || '--'}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Zero-Crossing Rate (ZCR):</span>
            <span className="metric-value">{recorder.metrics.zcr || '--'}</span>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                Voice Acoustic Anomaly:
              </span>
              <span className={`log-badge ${isSpoof ? 'badge-danger' : 'badge-info'}`}>
                {voiceAnomaly !== null ? (isSpoof ? `SPOOF ALERT (${percent}%)` : `AUTHENTICATED (${percent}%)`) : 'AWAITING SAMPLE'}
              </span>
            </div>
            <div className="meter-bar-container" style={{ margin: '0.6rem 0 0.2rem' }}>
              <div
                className="meter-bar-fill"
                style={{
                  width: `${percent}%`,
                  background: isSpoof ? 'var(--accent-danger)' : 'var(--accent-emerald)'
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.4rem' }}>
              {voiceAnomaly !== null
                ? isSpoof
                  ? 'Critical acoustic discrepancy: Vocal tract resonance mismatch against enrolled baseline.'
                  : 'Acoustic timbre verified. Fundamental frequency within valid standard deviation.'
                : 'Record spoken sample to evaluate vocal biometric parameters.'}
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
              🧪 Quick Simulation Tests:
            </div>
            <div className="btn-group">
              <button className="btn btn-success" onClick={onSimulateValid}>
                <ShieldCheck size={14} /> Simulate Valid Speaker
              </button>
              <button className="btn btn-danger" onClick={onSimulateSpoof}>
                <AlertTriangle size={14} /> Simulate Voice Spoof
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>🛡️</span> Zero-Trust Voice Step-Up Challenge
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            When keystroke dynamics detect ambiguity (e.g., 50% - 70% risk), Aegis automatically triggers a{' '}
            <strong>Zero-Trust Step-Up Vocal Challenge</strong>. By combining vocal tract geometry with subconscious
            key-press muscle memory, the False Acceptance Rate (FAR) is reduced below <strong>0.001%</strong> while maintaining
            frictionless productivity.
          </p>
        </div>
      </div>
    </div>
  );
}
