import React, { useRef, useState } from 'react';
import { Mic, Volume2, ShieldCheck, AlertTriangle, Target, CheckCircle2 } from 'lucide-react';

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
          HERO VOICE VERDICT CARD
         ========================================================================= */}
      <div
        className="glass-card"
        style={{
          border: isMatch
            ? '2px solid rgba(16, 185, 129, 0.7)'
            : isSpoof
            ? '2px solid rgba(239, 68, 68, 0.8)'
            : '2px solid rgba(56, 189, 248, 0.3)',
          background: isMatch
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(10, 14, 23, 0.95) 100%)'
            : isSpoof
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(10, 14, 23, 0.95) 100%)'
            : 'rgba(17, 24, 39, 0.85)',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: isMatch
                  ? 'rgba(16, 185, 129, 0.2)'
                  : isSpoof
                  ? 'rgba(239, 68, 68, 0.25)'
                  : 'rgba(0, 240, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${isMatch ? '#10b981' : isSpoof ? '#ef4444' : '#00f0ff'}`
              }}
            >
              <Mic size={30} color={isMatch ? '#10b981' : isSpoof ? '#ef4444' : '#00f0ff'} />
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                VOICE ACOUSTIC VERDICT
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, marginTop: '0.15rem' }}>
                {isMatch ? (
                  <span style={{ color: 'var(--accent-emerald)' }}>✅ VOICE VERIFIED: IT'S YOU! ({ownerName})</span>
                ) : isSpoof ? (
                  <span style={{ color: 'var(--accent-danger)' }}>🚨 VOICE SPOOF ALERT: NOT {ownerName.toUpperCase()}!</span>
                ) : (
                  <span style={{ color: 'var(--accent-cyan)' }}>🎙️ CLICK MICROPHONE BELOW & SPEAK PASSPHRASE</span>
                )}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {isMatch ? (
                  <>Vocal cords pitch and spectral timbre match {ownerName}'s enrolled profile (<strong>{100 - percent}% Match</strong>).</>
                ) : isSpoof ? (
                  <>Vocal pitch deviates significantly from {ownerName}'s vocal tract geometry (<strong>{percent}% Anomaly</strong>).</>
                ) : (
                  <>The AI measures fundamental pitch frequency ($F_0$) and vocal tract timbre in real time using the Web Audio API.</>
                )}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '130px' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              VOICE MATCH
            </div>
            <div
              style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: isMatch ? 'var(--accent-emerald)' : isSpoof ? 'var(--accent-danger)' : 'var(--text-primary)',
                lineHeight: 1
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
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
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
              <Target size={15} /> 🎯 1-Click: "Save This As My Enrolled Voice"
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
              <Mic size={18} /> Step-by-Step Voice Verification
            </div>
            <span className="card-tag">
              {recorder.mode === 'live_mic' ? 'LIVE MICROPHONE' : 'SYNTHETIC DSP READY'}
            </span>
          </div>

          <div
            style={{
              background: 'rgba(0, 240, 255, 0.05)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
              🗣️ Official Passphrase (Speak this into mic):
            </strong>
            <p
              style={{
                fontSize: '1.05rem',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                marginTop: '0.35rem',
                fontWeight: 700
              }}
            >
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
              <Mic size={36} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '0.25rem' }}>
              {recorder.isRecording ? (
                <span style={{ color: 'var(--accent-danger)' }}>🔴 RECORDING LIVE... (Speak Now)</span>
              ) : (
                <span style={{ color: 'var(--accent-cyan)' }}>👉 Click Circle to Start Microphone</span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Speak for 3 to 4 seconds, then click again to stop and evaluate.
            </div>
          </div>

          {/* Waveform Canvas */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              TIME-DOMAIN WAVEFORM (LIVE OSCILLOSCOPE)
            </div>
            <div className="canvas-wrapper">
              <canvas ref={waveformCanvasRef} width={600} height={100} />
            </div>
          </div>

          {/* Spectrum Canvas */}
          <div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              FREQUENCY SPECTRUM (FFT FORMANTS)
            </div>
            <div className="canvas-wrapper">
              <canvas ref={spectrumCanvasRef} width={600} height={100} />
            </div>
          </div>
        </div>

        {/* Right: Acoustic Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Volume2 size={18} /> Vocal Tract Acoustic Parameters
              </div>
              <span className="card-tag">DIGITAL SIGNAL PROCESSING</span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Observed Pitch (F0):</span>
              <span className="metric-value">
                {recorder.metrics.pitch ? `${recorder.metrics.pitch} Hz` : '-- Hz'}
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Enrolled Baseline Pitch:</span>
              <span className="metric-value">
                {vBase.pitch_mean} Hz (±{vBase.pitch_std || 25} Hz)
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Spectral Centroid (Timbre):</span>
              <span className="metric-value">
                {recorder.metrics.centroid ? `${recorder.metrics.centroid} Hz` : '-- Hz'}{' '}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Base: {vBase.centroid_mean} Hz)</span>
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Acoustic Signal Energy:</span>
              <span className="metric-value">{recorder.metrics.rms || '--'}</span>
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
                  Acoustic Discrepancy Level:
                </span>
                <span className={`log-badge ${isSpoof ? 'badge-danger' : isMatch ? 'badge-info' : 'badge-warn'}`}>
                  {percent !== null ? (isSpoof ? `SPOOF ALERT (${percent}%)` : `MATCH (${percent}%)`) : 'AWAITING AUDIO'}
                </span>
              </div>

              <div className="meter-bar-container" style={{ margin: '0.6rem 0 0.2rem' }}>
                <div
                  className="meter-bar-fill"
                  style={{
                    width: `${percent !== null ? percent : 0}%`,
                    background: isSpoof ? 'var(--accent-danger)' : 'var(--accent-emerald)'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.4rem' }}>
                {isMatch
                  ? `Vocal cords and tract resonances match ${ownerName} with verified accuracy.`
                  : isSpoof
                  ? `Significant pitch discrepancy (>100 Hz delta). Not ${ownerName}!`
                  : 'Speak into microphone or click the test buttons below.'}
              </div>
            </div>

            {/* Quick Simulation Tests */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                🧪 Quick Simulation Tests:
              </div>
              <div className="btn-group">
                <button className="btn btn-success" onClick={onSimulateValid}>
                  <ShieldCheck size={14} /> Simulate Genuine Voice (It's Me)
                </button>
                <button className="btn btn-danger" onClick={onSimulateSpoof}>
                  <AlertTriangle size={14} /> Simulate Voice Impersonator (Stranger)
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>🛡️</span> Continuous Zero-Trust Security Strategy
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Voice acoustics acts as the <strong>Zero-Trust Step-Up arbiter</strong>. If your hands are tired or cold
              and keystroke timing drifts, speaking a 3-second passphrase immediately re-authenticates your physical
              identity without locking you out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
