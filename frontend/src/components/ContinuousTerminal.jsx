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
  CheckCircle2,
  Volume2
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
  quickVoiceState
}) {
  const keystrokeCanvasRef = useRef(null);
  const timelineCanvasRef = useRef(null);
  const riskHistoryRef = useRef([]);

  // Draw Keystroke Pulse Oscilloscope
  useEffect(() => {
    const canvas = keystrokeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();

    const pulses = collector.pulseData;
    if (pulses.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '12px Fira Code, monospace';
      ctx.fillText('⌨️ Awaiting keystrokes... Type your thoughts into the box above.', 20, height / 2 + 4);
      return;
    }

    const spacing = width / Math.max(pulses.length + 1, 10);
    const now = performance.now();

    pulses.forEach((p, i) => {
      const age = (now - p.time) / 1000;
      const alpha = Math.max(0.2, 1.0 - age * 0.08);

      const barH = (Math.min(Math.max(p.dwell, 30), 400) / 400) * (height - 40);
      const x = (i + 1) * spacing;
      const y = height - 20 - barH;

      let color = '#10b981';
      if (p.dwell > 170) color = '#f59e0b';
      if (p.dwell > 280) color = '#ef4444';

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x - 5, y, 10, barH);

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const label = p.key.length === 1 ? p.key : p.key.substring(0, 3);
      ctx.fillText(label, x, height - 6);

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${Math.round(p.dwell)}ms`, x, y - 4);
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

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.25);
    ctx.lineTo(width, height * 0.25);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    const points = riskHistoryRef.current;
    if (points.length < 2) return;

    const step = width / (points.length - 1);
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    points.forEach((score, i) => {
      const x = i * step;
      const y = height - (score / 100) * (height - 16) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    const lastScore = points[points.length - 1];
    let strokeColor = '#10b981';
    if (lastScore >= 50) strokeColor = '#f59e0b';
    if (lastScore >= 75) strokeColor = '#ef4444';

    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    const lastX = (points.length - 1) * step;
    const lastY = height - (lastScore / 100) * (height - 16) - 8;
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [assessment]);

  const riskScore = assessment ? assessment.risk_score : 0;
  const features = collector.getFeatures();
  const ownerName = activeProfile?.name || 'Ananya Sridhar';

  // Human Readable Identity Verdict
  const isAwaiting = collector.keyCount < 5;
  const isMe = !isAwaiting && riskScore < 45;
  const isDrift = !isAwaiting && riskScore >= 45 && riskScore < 70;
  const isIntruder = !isAwaiting && riskScore >= 70;

  const samplePrompt =
    'Security credentials must remain strictly protected against lateral movement and unauthorized impersonation.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* =========================================================================
          HERO VERDICT CARD: Who is at the keyboard right now?
         ========================================================================= */}
      <div
        className="glass-card"
        style={{
          border: isMe
            ? '2px solid rgba(16, 185, 129, 0.7)'
            : isIntruder
            ? '2px solid rgba(239, 68, 68, 0.8)'
            : isDrift
            ? '2px solid rgba(245, 158, 11, 0.7)'
            : '2px solid rgba(56, 189, 248, 0.3)',
          background: isMe
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(10, 14, 23, 0.95) 100%)'
            : isIntruder
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(10, 14, 23, 0.95) 100%)'
            : isDrift
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(10, 14, 23, 0.95) 100%)'
            : 'rgba(17, 24, 39, 0.85)',
          padding: '1.5rem',
          boxShadow: isIntruder ? '0 0 25px rgba(239, 68, 68, 0.3)' : 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: isMe
                  ? 'rgba(16, 185, 129, 0.2)'
                  : isIntruder
                  ? 'rgba(239, 68, 68, 0.25)'
                  : isDrift
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${isMe ? '#10b981' : isIntruder ? '#ef4444' : isDrift ? '#f59e0b' : '#38bdf8'}`
              }}
            >
              {isMe ? (
                <UserCheck size={32} color="#10b981" />
              ) : isIntruder ? (
                <UserX size={32} color="#ef4444" />
              ) : isDrift ? (
                <ShieldAlert size={32} color="#f59e0b" />
              ) : (
                <Terminal size={32} color="#38bdf8" />
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                CURRENT BIOMETRIC VERDICT
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '0.02em', marginTop: '0.15rem' }}>
                {isMe ? (
                  <span style={{ color: 'var(--accent-emerald)' }}>✅ IT'S YOU! ({ownerName} Confirmed)</span>
                ) : isIntruder ? (
                  <span style={{ color: 'var(--accent-danger)' }}>🚨 INTRUDER ALERT! (NOT {ownerName.toUpperCase()})</span>
                ) : isDrift ? (
                  <span style={{ color: 'var(--accent-warning)' }}>⚠️ SLIGHT CADENCE DRIFT (Unusual Rhythm)</span>
                ) : (
                  <span style={{ color: 'var(--accent-cyan)' }}>⌨️ TYPE 5+ CHARACTERS TO IDENTIFY WHO YOU ARE</span>
                )}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {isMe ? (
                  <>Your finger hold durations and typing rhythm match {ownerName}'s subconscious motor memory (<strong>{100 - riskScore}% Match</strong>).</>
                ) : isIntruder ? (
                  <>Typing cadence deviates by <strong>{riskScore}%</strong> from {ownerName}'s baseline. Physical terminal takeover suspected!</>
                ) : isDrift ? (
                  <>Minor variation in typing speed (could be typing with one hand, cold fingers, or fatigue).</>
                ) : (
                  <>Start typing naturally into the defense box below. The system measures hold time and flight latency between keys.</>
                )}
              </p>
            </div>
          </div>

          {/* Quick Match Percentage Pill */}
          <div style={{ textAlign: 'right', minWidth: '130px' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              IDENTITY CONFIDENCE
            </div>
            <div
              style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: isMe ? 'var(--accent-emerald)' : isIntruder ? 'var(--accent-danger)' : 'var(--text-primary)',
                lineHeight: 1
              }}
            >
              {isAwaiting ? '--' : `${100 - riskScore}%`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {isMe ? 'Verified Genuine' : isIntruder ? 'Impersonator Flagged' : 'Awaiting input'}
            </div>
          </div>
        </div>

        {/* 1-Click Calibration & Fast Action Toolbar */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* 1-Click Auto Calibrate */}
            <button
              className="btn btn-success"
              style={{ padding: '0.55rem 1.1rem', fontWeight: 700 }}
              onClick={onAutoCalibrate}
              title="Click after typing any sentence to adapt the baseline to your exact speed"
            >
              <Target size={16} /> 🎯 1-Click: "Teach System This is Me"
            </button>

            {/* Quick Simulate Intruder */}
            <button
              className="btn btn-danger"
              style={{ padding: '0.55rem 1rem' }}
              onClick={onQuickSimulateStranger}
              title="Test how the system detects a stranger typing"
            >
              <UserX size={16} /> 👥 Test Stranger / Intruder Typing
            </button>

            {/* Quick Voice Check */}
            <button
              className="btn btn-primary"
              style={{ padding: '0.55rem 1rem' }}
              onClick={onQuickVoiceVerify}
              title="Record 3s voice to test vocal verification right here"
            >
              <Mic size={16} /> 🎙️ Quick Voice Check (Say Hello)
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Target: <strong style={{ color: 'var(--accent-cyan)' }}>{ownerName}</strong>
          </div>
        </div>

        {/* Quick Voice Inline Alert Bar if voice was just tested */}
        {quickVoiceState && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: quickVoiceState.isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${quickVoiceState.isVerified ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Volume2 size={20} color={quickVoiceState.isVerified ? '#10b981' : '#ef4444'} />
            <div>
              <strong style={{ color: quickVoiceState.isVerified ? 'var(--accent-emerald)' : 'var(--accent-danger)' }}>
                {quickVoiceState.isVerified ? '🎙️ Voice Confirmed: Matches You!' : '🚨 Voice Discrepancy: Different Speaker!'}
              </strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {quickVoiceState.message}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          WORKSPACE GRID: Terminal Input (Left) & Biometric Metrics (Right)
         ========================================================================= */}
      <div className="grid-workspace">
        
        {/* Left: Interactive Typing Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Terminal size={18} />
                Live Defense Console (Type Naturally Here)
              </div>
              <span className="card-tag">SUB-MS SAMPLING ACTIVE</span>
            </div>

            <div className="terminal-window">
              <div className="terminal-titlebar">
                <div className="terminal-controls">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <span>operator@defense-workstation: ~</span>
                <span>SEC-LEVEL: ZERO-TRUST</span>
              </div>
              <div className="terminal-body">
                <div className="terminal-prompt-box">
                  $ aegis-biometric-agent --monitor-continuous --target="{ownerName}"
                </div>
                <textarea
                  id="react-terminal-input"
                  className="terminal-input-area"
                  style={{ minHeight: '140px' }}
                  placeholder="Type anything naturally here... (e.g., 'Hello this is me, checking cloud infrastructure credentials and database logs')"
                  onKeyDown={collector.handleKeyDown}
                  onKeyUp={collector.handleKeyUp}
                />
              </div>
            </div>

            <div className="sample-text-guide">
              <strong>💡 Click to paste sample phrase:</strong>{' '}
              <span
                style={{ cursor: 'pointer', color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                onClick={() => {
                  const el = document.getElementById('react-terminal-input');
                  if (el) {
                    el.value = samplePrompt;
                    el.focus();
                  }
                }}
              >
                "{samplePrompt}"
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div className="btn-group">
                <button className="btn btn-primary" onClick={onEvaluate}>
                  <Sparkles size={14} /> Evaluate Now
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    const el = document.getElementById('react-terminal-input');
                    if (el) el.value = '';
                    onClear();
                  }}
                >
                  <RefreshCw size={14} /> Clear Input
                </button>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Keys Logged: <strong style={{ color: 'var(--accent-cyan)' }}>{collector.keyCount}</strong> | Typing Speed:{' '}
                <strong style={{ color: 'var(--accent-emerald)' }}>{features ? `${features.wpm} WPM` : '--'}</strong>
              </div>
            </div>
          </div>

          {/* Keystroke Oscilloscope */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>📊</span> Live Keystroke Oscilloscope (Finger Hold Duration)
              </div>
              <span className="card-tag">SUB-MS RESOLUTION</span>
            </div>
            <div className="canvas-wrapper">
              <canvas ref={keystrokeCanvasRef} width={700} height={120} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--text-muted)'
              }}
            >
              <span>Bar Height = Finger Hold Time (ms)</span>
              <span>Bar Spacing = Flight Latency (ms)</span>
              <span>Green: Normal | Amber: Slow (&gt;170ms) | Red: Outlier</span>
            </div>
          </div>
        </div>

        {/* Right: Human-Understandable Biometric Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Plain English Metrics Card */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <ShieldCheck size={18} /> Biometric Parameters vs {ownerName}
              </div>
              <span className="card-tag">LIVE VERIFICATION</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div className="metric-row">
                <span className="metric-label">Finger Hold Time (Dwell):</span>
                <span className="metric-value">
                  {features ? `${features.dwell_mean} ms` : '-- ms'}{' '}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    (Baseline: {activeProfile?.keystroke_baseline?.dwell_mean || 110} ms)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Inter-Key Latency (Flight):</span>
                <span className="metric-value">
                  {features ? `${features.flight_mean} ms` : '-- ms'}{' '}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    (Baseline: {activeProfile?.keystroke_baseline?.flight_mean || 145} ms)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Typing Cadence & Rhythm:</span>
                <span className="metric-value">
                  {features ? (features.rhythm_cv < 0.4 ? '✅ Smooth & Rhythmic' : '⚠️ Irregular / Hesitant') : '--'}
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Speed & Words Per Minute:</span>
                <span className="metric-value">
                  {features ? `${features.wpm} WPM` : '-- WPM'}{' '}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    (Baseline: {activeProfile?.keystroke_baseline?.wpm || 58} WPM)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Correction / Backspace Rate:</span>
                <span className="metric-value">
                  {features ? `${Math.round(features.backspace_rate * 100)}%` : '--%'}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                🛡️ AI Security Advice:
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {assessment?.recommendation || 'Continuous authentication passing. Session verified.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-danger" onClick={onQuarantine} style={{ flex: 1 }}>
                <AlertOctagon size={14} /> Quarantine Session
              </button>
              <button className="btn btn-primary" onClick={onStepUp} style={{ flex: 1 }}>
                <KeyRound size={14} /> Challenge Step-Up
              </button>
            </div>
          </div>

          {/* Risk Timeline Stream */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>📈</span> Continuous Risk Trend Stream
              </div>
              <span className="card-tag">50-SAMPLE WINDOW</span>
            </div>
            <div className="canvas-wrapper">
              <canvas ref={timelineCanvasRef} width={400} height={120} />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
