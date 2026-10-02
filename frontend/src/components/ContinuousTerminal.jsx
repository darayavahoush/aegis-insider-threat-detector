import React, { useRef, useEffect, useState } from 'react';
import {
  Terminal,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Target,
  Sparkles,
  RefreshCw,
  Mic,
  AlertOctagon,
  KeyRound,
  Volume2,
  CheckCircle2,
  XCircle,
  Activity,
  ClipboardCopy,
  ChevronDown,
  ChevronUp,
  Info,
  Cpu
} from 'lucide-react';

export default function ContinuousTerminal({
  collector,
  assessment,
  activeProfile,
  onEvaluate,
  onClear,
  onQuarantine,
  onStepUp,
  onAutoCalibrate,
  onQuickSimulateStranger,
  onQuickVoiceVerify,
  quickVoiceState,
  onSaveVoiceBaseline
}) {
  const keystrokeCanvasRef = useRef(null);
  const timelineCanvasRef = useRef(null);
  const riskHistoryRef = useRef([]);
  const [showGuide, setShowGuide] = useState(true);

  const samplePrompt =
    'Zero trust requires continuous identity verification across all privileged operations and sensitive database queries.';

  // Draw Keystroke Pulse Oscilloscope
  useEffect(() => {
    const canvas = keystrokeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();

    const pulses = collector.pulseData;
    if (pulses.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Awaiting keystrokes... Type naturally in the console above.', 20, height / 2 + 4);
      return;
    }

    const spacing = width / Math.max(pulses.length + 1, 10);
    const now = performance.now();

    pulses.forEach((p, i) => {
      const age = (now - p.time) / 1000;
      const alpha = Math.max(0.3, 1.0 - age * 0.08);

      const barH = (Math.min(Math.max(p.dwell, 30), 350) / 350) * (height - 35);
      const x = (i + 1) * spacing;
      const y = height - 20 - barH;

      let color = '#10b981';
      if (p.dwell > 160) color = '#f59e0b';
      if (p.dwell > 280) color = '#f43f5e';

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x - 4, y, 8, barH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Fira Code, monospace';
      ctx.textAlign = 'center';
      const label = p.key === ' ' ? '␣' : p.key.length === 1 ? p.key : p.key.substring(0, 3);
      ctx.fillText(label, x, height - 6);
    });

    ctx.globalAlpha = 1.0;
  }, [collector.pulseData]);

  // Risk timeline
  useEffect(() => {
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    if (assessment && typeof assessment.risk_score === 'number') {
      riskHistoryRef.current.push(assessment.risk_score);
      if (riskHistoryRef.current.length > 40) riskHistoryRef.current.shift();
    }

    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.3);
    ctx.lineTo(width, height * 0.3);
    ctx.moveTo(0, height * 0.6);
    ctx.lineTo(width, height * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);

    const points = riskHistoryRef.current;
    if (points.length < 2) return;

    const step = width / (points.length - 1);
    ctx.lineWidth = 2;
    ctx.beginPath();

    points.forEach((score, i) => {
      const x = i * step;
      const y = height - (score / 100) * (height - 16) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    const lastScore = points[points.length - 1];
    let strokeColor = '#10b981';
    if (lastScore >= 35) strokeColor = '#f59e0b';
    if (lastScore >= 60) strokeColor = '#f43f5e';

    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }, [assessment]);

  const riskScore = assessment ? assessment.risk_score : 0;
  const features = collector.getFeatures();
  const ownerName = activeProfile?.name || 'Ananya Sridhar';

  // Human Readable Identity Verdict
  const isAwaiting = collector.keyCount < 5;
  const isMe = !isAwaiting && riskScore < 35;
  const isDrift = !isAwaiting && riskScore >= 35 && riskScore < 60;
  const isIntruder = !isAwaiting && riskScore >= 60;

  const typenetDetails = assessment?.details?.keystroke || {};
  const typenetMatchPct = typenetDetails.typenet_cosine_similarity !== undefined
    ? Math.round(typenetDetails.typenet_cosine_similarity * 100)
    : null;

  const handlePasteSampleText = () => {
    const el = document.getElementById('react-terminal-input');
    if (el) {
      el.value = samplePrompt;
      el.focus();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* =========================================================================
          GUIDED WALKTHROUGH BANNER (Interactive & Collapsible)
         ========================================================================= */}
      <div className="guided-stepper-card">
        <div className="stepper-header" onClick={() => setShowGuide(!showGuide)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Sparkles size={16} className="text-indigo-400" />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Interactive Quick-Start Guide
            </span>
            <span className="stepper-badge">HOW TO TEST IN 3 STEPS</span>
          </div>
          <button className="stepper-toggle-btn">
            {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {showGuide && (
          <div className="stepper-steps-grid">
            <div className="step-card">
              <div className="step-number">STEP 1</div>
              <div className="step-title">Type in the Terminal</div>
              <div className="step-desc">
                Type naturally in the console below (or click <em>Paste Sample Text</em>). The oscilloscope measures your hold and transition timings.
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">STEP 2</div>
              <div className="step-title">Lock Your Baseline</div>
              <div className="step-desc">
                Click <strong style={{ color: 'var(--accent-success)' }}>Set as My Baseline</strong>. This tunes the TypeNet neural network to your personal motor habits.
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">STEP 3</div>
              <div className="step-title">Simulate Threat</div>
              <div className="step-desc">
                Click <strong style={{ color: 'var(--accent-danger)' }}>Simulate Intruder</strong> to see the zero-trust engine detect abnormal rhythms and flag alerts.
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">OPTIONAL</div>
              <div className="step-title">Quick Voice Check</div>
              <div className="step-desc">
                Click <strong style={{ color: '#818cf8' }}>Quick Voice Check</strong> to speak your passphrase and verify pitch & vocal tract acoustics.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          REFINED IDENTITY VERDICT CARD (Calm, Executive Status)
         ========================================================================= */}
      <div
        className="glass-card"
        style={{
          border: isMe
            ? '1px solid rgba(16, 185, 129, 0.35)'
            : isIntruder
            ? '1px solid rgba(244, 63, 94, 0.35)'
            : isDrift
            ? '1px solid rgba(245, 158, 11, 0.35)'
            : '1px solid var(--border-subtle)',
          background: isMe
            ? 'rgba(16, 185, 129, 0.03)'
            : isIntruder
            ? 'rgba(244, 63, 94, 0.04)'
            : isDrift
            ? 'rgba(245, 158, 11, 0.03)'
            : 'var(--bg-surface)',
          padding: '1.25rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                background: isMe
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isIntruder
                  ? 'rgba(244, 63, 94, 0.12)'
                  : isDrift
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'var(--bg-surface-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {isMe ? (
                <UserCheck size={24} color="#10b981" />
              ) : isIntruder ? (
                <UserX size={24} color="#f43f5e" />
              ) : isDrift ? (
                <ShieldAlert size={24} color="#f59e0b" />
              ) : (
                <Terminal size={24} color="#94a3b8" />
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                CURRENT IDENTITY POSTURE
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', marginTop: '0.1rem' }}>
                {isMe ? (
                  <span style={{ color: 'var(--accent-success)' }}>Identity Confirmed: {ownerName}</span>
                ) : isIntruder ? (
                  <span style={{ color: 'var(--accent-danger)' }}>Unrecognized Operator (Intruder Flagged)</span>
                ) : isDrift ? (
                  <span style={{ color: 'var(--accent-warning)' }}>Cadence Variation Detected</span>
                ) : (
                  <span style={{ color: 'var(--text-primary)' }}>Awaiting Keystrokes &mdash; Type Naturally Below</span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {isMe ? (
                  <>Typing hold and flight intervals match {ownerName}'s habitual motor pattern (<strong>{100 - riskScore}% confidence</strong>).</>
                ) : isIntruder ? (
                  <>Typing cadence deviates significantly ({riskScore}% anomaly) from {ownerName}'s enrolled profile.</>
                ) : isDrift ? (
                  <>Typing speed has minor drift. Possible fatigue or hand posture change.</>
                ) : (
                  <>Start typing in the black console below. The system evaluates sub-millisecond motor timing vectors.</>
                )}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '120px' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {isMe ? 'CONFIDENCE' : 'THREAT RISK'}
            </div>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: isMe ? 'var(--accent-success)' : isIntruder ? 'var(--accent-danger)' : 'var(--text-primary)',
                lineHeight: 1,
                marginTop: '0.15rem'
              }}
            >
              {isAwaiting ? '--' : isMe ? `${100 - riskScore}%` : `${riskScore}%`}
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="terminal-actions-toolbar">
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="action-btn action-btn-primary"
              onClick={onAutoCalibrate}
              title="Click after typing any sentence to adapt the baseline to your exact speed"
            >
              <Target size={14} /> Set as My Baseline
            </button>

            <button
              className="action-btn action-btn-danger"
              onClick={onQuickSimulateStranger}
              title="Test how the system detects an unauthorized stranger typing"
            >
              <UserX size={14} /> Simulate Intruder
            </button>

            <button
              className="action-btn action-btn-secondary"
              onClick={onQuickVoiceVerify}
              title="Test voice biometric verification"
            >
              <Mic size={14} /> Quick Voice Check (3.5s)
            </button>

            <button
              className="action-btn action-btn-subtle"
              onClick={handlePasteSampleText}
              title="Paste standard security policy text to test typing quickly"
            >
              <ClipboardCopy size={14} /> Paste Sample Text
            </button>
          </div>

          <button
            className="action-btn action-btn-ghost"
            onClick={onClear}
            title="Reset terminal and clear all buffers"
          >
            <RefreshCw size={13} /> Clear Console
          </button>
        </div>

        {/* Quick Voice Verification Banner */}
        {quickVoiceState && (
          <div className="voice-check-banner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Volume2
                  size={15}
                  color={
                    quickVoiceState.isRecording
                      ? '#6366f1'
                      : quickVoiceState.isVerified
                      ? '#10b981'
                      : '#f43f5e'
                  }
                />
                <strong
                  style={{
                    fontSize: '0.82rem',
                    color: quickVoiceState.isRecording
                      ? '#a5b4fc'
                      : quickVoiceState.isVerified
                      ? 'var(--accent-success)'
                      : 'var(--accent-danger)'
                  }}
                >
                  {quickVoiceState.isRecording
                    ? `Listening to Microphone... ${quickVoiceState.countdown}s remaining`
                    : quickVoiceState.isVerified
                    ? 'Voice Confirmed: Speaker Matches Enrolled Profile'
                    : 'Voice Discrepancy Flagged: Speaker Mismatch'}
                </strong>
              </div>

              {quickVoiceState.isRecording && (
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#818cf8' }}>
                  RECORDING 3.5s
                </span>
              )}
            </div>

            {/* Live VU Meter during recording */}
            {quickVoiceState.isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  MIC LEVEL
                </span>
                <div className="quick-vu-track">
                  <div
                    className="quick-vu-fill"
                    style={{ width: `${Math.round((quickVoiceState.level || 0) * 100)}%` }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Speak: "My voice is my password"
                </span>
              </div>
            )}

            {/* Verification result summary */}
            {!quickVoiceState.isRecording && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  {quickVoiceState.message}
                </div>

                {quickVoiceState.observedPitch && onSaveVoiceBaseline && (
                  <button
                    className="action-btn action-btn-primary"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                    onClick={() =>
                      onSaveVoiceBaseline({
                        pitch_mean: quickVoiceState.observedPitch,
                        pitch_std: 20,
                        centroid_mean: quickVoiceState.observedCentroid || 1720,
                        formant_ratio: 1.22
                      })
                    }
                  >
                    <Target size={12} /> Save {quickVoiceState.observedPitch} Hz as Voice Baseline
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          WORKSPACE GRID: Terminal Input (Left) & Biometric Metrics (Right)
         ========================================================================= */}
      <div className="grid-workspace">
        
        {/* Left: Terminal Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Terminal size={15} />
                Continuous Keystroke Capture Console
              </div>
              <span className="card-tag">1,000 Hz MOTOR SAMPLING</span>
            </div>

            {/* Live Cadence Telemetry Strip */}
            <div className="cadence-telemetry-strip">
              <div className="cadence-item">
                <span className="cadence-lbl">Letter Hold:</span>
                <strong className="cadence-val">
                  {collector.cadence.dwellLetter ? `${collector.cadence.dwellLetter} ms` : '--'}
                </strong>
              </div>
              <div className="cadence-item">
                <span className="cadence-lbl">Spacebar Hold:</span>
                <strong className="cadence-val">
                  {collector.cadence.dwellSpace ? `${collector.cadence.dwellSpace} ms` : '--'}
                </strong>
              </div>
              <div className="cadence-item">
                <span className="cadence-lbl">Motor Flight:</span>
                <strong className="cadence-val">
                  {collector.cadence.flightMotor ? `${collector.cadence.flightMotor} ms` : '--'}
                </strong>
              </div>
              <div className="cadence-item">
                <span className="cadence-lbl">Typing Speed:</span>
                <strong className="cadence-val">
                  {collector.cadence.wpm ? `${collector.cadence.wpm} WPM` : '--'}
                </strong>
              </div>
            </div>

            <div className="terminal-window">
              <div className="terminal-titlebar">
                <div className="terminal-controls">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <div className="terminal-session-info">
                  session: zero_trust_terminal &mdash; operator: {ownerName}
                </div>
              </div>

              <div className="terminal-body">
                <textarea
                  id="react-terminal-input"
                  rows={4}
                  placeholder="Type any sentence naturally to verify behavioral biometrics (e.g. 'The quick brown fox jumps over the lazy dog')..."
                  onKeyDown={collector.handleKeyDown}
                  onKeyUp={collector.handleKeyUp}
                  className="terminal-textarea"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Keystrokes buffered: <strong>{collector.keyCount}</strong> keys
              </span>
              <button
                className="btn-link"
                onClick={handlePasteSampleText}
              >
                Insert prompt text &rarr;
              </button>
            </div>
          </div>

          {/* Oscilloscope Pulse Waveform */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={15} />
                Sub-Millisecond Dwell & Flight Oscilloscope
              </div>
              <span className="card-tag">REAL-TIME MOTOR RHYTHM</span>
            </div>

            <div className="canvas-wrapper">
              <canvas ref={keystrokeCanvasRef} width={700} height={100} />
            </div>
            <div className="oscilloscope-legend">
              <span>Height: Key Depress Duration</span>
              <span>Spacing: Release-to-Press Latency</span>
              <span>Green: Regular | Amber: Spacebar | Red: Hesitation</span>
            </div>
          </div>
        </div>

        {/* Right: Forensic Biometric Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <ShieldCheck size={15} /> Biometric Telemetry vs {ownerName}
              </div>
              <span className="card-tag">DIAGNOSTICS</span>
            </div>

            {/* TypeNet Deep Learning Metric Card */}
            <div className="typenet-telemetry-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc', fontWeight: 600, fontSize: '0.76rem' }}>
                  <Cpu size={14} /> TypeNet 128-d Embedding Match:
                </div>
                <strong style={{ fontSize: '0.85rem', color: typenetMatchPct && typenetMatchPct >= 70 ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                  {typenetMatchPct !== null ? `${typenetMatchPct}%` : '--%'}
                </strong>
              </div>

              {/* Progress bar */}
              <div className="metric-progress-track">
                <div
                  className="metric-progress-fill"
                  style={{
                    width: `${typenetMatchPct || 0}%`,
                    background:
                      typenetMatchPct && typenetMatchPct >= 75
                        ? '#10b981'
                        : typenetMatchPct && typenetMatchPct >= 50
                        ? '#f59e0b'
                        : '#f43f5e'
                  }}
                />
              </div>

              <div className="typenet-submetrics-grid">
                <div>
                  <span className="submetric-lbl">Ledoit-Wolf D_M:</span>
                  <span className="submetric-val">{typenetDetails.mahalanobis_distance !== undefined ? typenetDetails.mahalanobis_distance : '--'}</span>
                </div>
                <div>
                  <span className="submetric-lbl">One-Class SVM:</span>
                  <span
                    className="submetric-val"
                    style={{
                      color:
                        typenetDetails.oc_svm_inlier === true
                          ? 'var(--accent-success)'
                          : typenetDetails.oc_svm_inlier === false
                          ? 'var(--accent-danger)'
                          : 'var(--text-muted)'
                    }}
                  >
                    {typenetDetails.oc_svm_inlier !== undefined ? (typenetDetails.oc_svm_inlier ? 'INLIER' : 'ANOMALY') : '--'}
                  </span>
                </div>
                <div>
                  <span className="submetric-lbl">Jitter Entropy:</span>
                  <span className="submetric-val">
                    {typenetDetails.shannon_entropy_bits !== undefined ? `${typenetDetails.shannon_entropy_bits} bits` : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Observed Dynamics vs Baseline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.85rem' }}>
              <div className="metric-row">
                <span className="metric-label">Letter Hold (Dwell):</span>
                <span className="metric-value">
                  {features ? `${features.dwell_letter_mean || features.dwell_mean} ms` : '-- ms'}{' '}
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    (Base: {activeProfile?.keystroke_baseline?.dwell_letter_mean || 96} ms)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Spacebar Hold:</span>
                <span className="metric-value">
                  {features ? `${features.dwell_space_mean || '--'} ms` : '-- ms'}{' '}
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    (Base: {activeProfile?.keystroke_baseline?.dwell_space_mean || 185} ms)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Motor Flight Latency:</span>
                <span className="metric-value">
                  {features ? `${features.flight_motor_mean || features.flight_mean} ms` : '-- ms'}{' '}
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    (Base: {activeProfile?.keystroke_baseline?.flight_motor_mean || 118} ms)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Typing Velocity:</span>
                <span className="metric-value">
                  {features ? `${features.wpm} WPM` : '-- WPM'}{' '}
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    (Base: {activeProfile?.keystroke_baseline?.wpm || 58} WPM)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Rhythm Stability:</span>
                <span className="metric-value">
                  {features ? (features.rhythm_cv < 0.38 ? 'Consistent Habit' : 'Irregular Pacing') : '--'}
                </span>
              </div>
            </div>

            {/* System Assessment */}
            <div className="system-assessment-box">
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.76rem', marginBottom: '0.2rem' }}>
                Zero-Trust Policy Verdict:
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {assessment?.recommendation || 'Continuous authentication passing.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="action-btn action-btn-danger" onClick={onQuarantine} style={{ flex: 1 }}>
                <AlertOctagon size={13} /> Quarantine
              </button>
              <button className="action-btn action-btn-secondary" onClick={onStepUp} style={{ flex: 1 }}>
                <KeyRound size={13} /> Step-Up MFA
              </button>
            </div>
          </div>

          {/* Risk Timeline Stream */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>📈</span> Continuous Risk Trend
              </div>
              <span className="card-tag">TIME SERIES</span>
            </div>
            <div className="canvas-wrapper">
              <canvas ref={timelineCanvasRef} width={400} height={90} />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
