import React, { useRef, useState } from 'react';
import { Mic, Volume2, ShieldCheck, AlertTriangle, Target } from 'lucide-react';

export default function VoiceConsole({
  recorder,
  activeProfile,
  voiceAnomaly,
  onSimulateValid,
  onSimulateSpoof,
  onSaveVoiceBaseline,
  showToast
}) {
  const waveformCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);
  const [recordedAudioProfile, setRecordedAudioProfile] = useState(null);

  const ownerName = activeProfile?.name || 'Ananya Sridhar';

  // Real-time canvas renderers (calm slate & emerald colors)
  const handleAudioFrame = ({ timeData, freqData }) => {
    // Waveform
    const wCanvas = waveformCanvasRef.current;
    if (wCanvas && timeData) {
      const ctx = wCanvas.getContext('2d');
      const width = wCanvas.width;
      const height = wCanvas.height;

      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
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

      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = width / barCount - 2;
      const step = Math.floor(freqData.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * step] / 255;
        const barHeight = val * (height - 8);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }
  };

  const toggleRecording = async () => {
    if (!recorder.isRecording) {
      await recorder.startListening(handleAudioFrame);
    } else {
      const profile = recorder.stopListening();
      setRecordedAudioProfile(profile);
    }
  };

  const vBase = activeProfile?.voice_baseline || { pitch_mean: 210, centroid_mean: 1750 };
  const percent = voiceAnomaly !== null ? voiceAnomaly : null;
  const isSpoof = percent !== null && percent >= 50;
  const isMatch = percent !== null && percent < 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* =========================================================================
          VOICE STATUS CARD
         ========================================================================= */}
      <div
        className="glass-card"
        style={{
          border: isMatch
            ? '1px solid rgba(16, 185, 129, 0.4)'
            : isSpoof
            ? '1px solid rgba(244, 63, 94, 0.4)'
            : '1px solid var(--border-subtle)',
          background: isMatch
            ? 'rgba(16, 185, 129, 0.04)'
            : isSpoof
            ? 'rgba(244, 63, 94, 0.05)'
            : 'var(--bg-surface)',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: isMatch
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isSpoof
                  ? 'rgba(244, 63, 94, 0.12)'
                  : 'var(--bg-surface-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <Mic size={24} color={isMatch ? '#10b981' : isSpoof ? '#f43f5e' : '#94a3b8'} />
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                VOICE ACOUSTIC VERIFICATION
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {isMatch ? (
                  <span style={{ color: 'var(--accent-success)' }}>Voice Confirmed: {ownerName}</span>
                ) : isSpoof ? (
                  <span style={{ color: 'var(--accent-danger)' }}>Voice Mismatch Detected</span>
                ) : (
                  <span style={{ color: 'var(--text-primary)' }}>Click microphone below and speak passphrase</span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {isMatch ? (
                  <>Vocal tract resonances match {ownerName}'s enrolled profile (<strong>{100 - percent}% confidence</strong>).</>
                ) : isSpoof ? (
                  <>Observed pitch deviates from {ownerName}'s enrolled baseline.</>
                ) : (
                  <>The system measures fundamental pitch ($F_0$) and timbre using the browser's Web Audio API.</>
                )}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '120px' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              VOICE MATCH
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: isMatch ? 'var(--accent-success)' : isSpoof ? 'var(--accent-danger)' : 'var(--text-primary)',
                lineHeight: 1,
                marginTop: '0.2rem'
              }}
            >
              {percent !== null ? `${100 - percent}%` : '--'}
            </div>
          </div>
        </div>

        {/* 1-Click Save Voice Baseline */}
        {recordedAudioProfile && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Captured Pitch: <strong>{recordedAudioProfile.pitch_mean} Hz</strong> | Timbre:{' '}
              <strong>{recordedAudioProfile.centroid_mean} Hz</strong>
            </div>
            <button
              className="btn btn-success"
              onClick={() => onSaveVoiceBaseline(recordedAudioProfile)}
            >
              <Target size={15} /> Save as My Enrolled Voice
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          INTERACTIVE VOICE CONSOLE
         ========================================================================= */}
      <div className="grid-2">
        {/* Left: Audio Recorder */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Mic size={16} /> Audio Capture
            </div>
            <span className="card-tag">
              {recorder.mode === 'live_mic' ? 'MICROPHONE' : 'DSP READY'}
            </span>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Verification Passphrase
            </div>
            <p style={{ fontSize: '0.92rem', color: '#fff', marginTop: '0.25rem', fontWeight: 500 }}>
              "My voice is my password, verify my security clearance."
            </p>
          </div>

          <div className="mic-control-box">
            <div
              className={`mic-btn-circle ${recorder.isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              style={{ cursor: 'pointer' }}
              title={recorder.isRecording ? 'Click to Stop' : 'Click to Speak'}
            >
              <Mic size={28} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {recorder.isRecording ? (
                <span style={{ color: 'var(--accent-danger)' }}>Recording... Speak now</span>
              ) : (
                <span style={{ color: 'var(--text-primary)' }}>Click to start microphone</span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Speak for 3 to 4 seconds, then click again to evaluate.
            </div>
          </div>

          {/* Waveform Canvas */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              TIME-DOMAIN WAVEFORM
            </div>
            <div className="canvas-wrapper">
              <canvas ref={waveformCanvasRef} width={600} height={90} />
            </div>
          </div>

          {/* Spectrum Canvas */}
          <div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              FREQUENCY SPECTRUM
            </div>
            <div className="canvas-wrapper">
              <canvas ref={spectrumCanvasRef} width={600} height={90} />
            </div>
          </div>
        </div>

        {/* Right: Acoustic Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Volume2 size={16} /> Extracted Acoustic Parameters
              </div>
              <span className="card-tag">SIGNAL DSP</span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Observed Pitch (F0):</span>
              <span className="metric-value">
                {recorder.metrics.pitch ? `${recorder.metrics.pitch} Hz` : '-- Hz'}
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Baseline Pitch Target:</span>
              <span className="metric-value">
                {vBase.pitch_mean} Hz (±{vBase.pitch_std || 25} Hz)
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Spectral Centroid:</span>
              <span className="metric-value">
                {recorder.metrics.centroid ? `${recorder.metrics.centroid} Hz` : '-- Hz'}{' '}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Target: {vBase.centroid_mean} Hz)</span>
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Signal Energy (RMS):</span>
              <span className="metric-value">{recorder.metrics.rms || '--'}</span>
            </div>

            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Acoustic Discrepancy:
                </span>
                <span className={`log-badge ${isSpoof ? 'badge-danger' : isMatch ? 'badge-info' : 'badge-warn'}`}>
                  {percent !== null ? (isSpoof ? `MISMATCH (${percent}%)` : `MATCH (${percent}%)`) : 'AWAITING AUDIO'}
                </span>
              </div>

              <div className="meter-bar-container" style={{ margin: '0.5rem 0' }}>
                <div
                  className="meter-bar-fill"
                  style={{
                    width: `${percent !== null ? percent : 0}%`,
                    background: isSpoof ? 'var(--accent-danger)' : 'var(--accent-success)'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {isMatch
                  ? `Vocal pitch and formant distribution match ${ownerName}.`
                  : isSpoof
                  ? `Significant acoustic delta. Speaker not confirmed.`
                  : 'Speak into microphone or click the test buttons below.'}
              </div>
            </div>

            {/* Quick Simulation Tests */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Quick Simulations:
              </div>
              <div className="btn-group">
                <button className="btn btn-success" onClick={onSimulateValid}>
                  <ShieldCheck size={14} /> Simulate Genuine Voice
                </button>
                <button className="btn btn-danger" onClick={onSimulateSpoof}>
                  <AlertTriangle size={14} /> Simulate Impersonator
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>🛡️</span> Zero-Trust Voice Policy
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Voice acoustics acts as a secondary zero-trust factor. When typing cadence drifts due to fatigue or keyboard
              swapping, vocal verification provides immediate re-authentication without session disruption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
