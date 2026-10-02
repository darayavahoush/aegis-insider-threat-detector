import React, { useRef, useEffect } from 'react';
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

  // Draw Keystroke Pulse Oscilloscope (Calm Slate/Emerald)
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
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

      // Subtle, calm colors
      let color = '#10b981'; // Calm emerald
      if (p.dwell > 170) color = '#f59e0b';
      if (p.dwell > 280) color = '#f43f5e';

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x - 4, y, 8, barH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Fira Code, monospace';
      ctx.textAlign = 'center';
      const label = p.key.length === 1 ? p.key : p.key.substring(0, 3);
      ctx.fillText(label, x, height - 6);
    });

    ctx.globalAlpha = 1.0;
  }, [collector.pulseData]);

  // Risk timeline (Subtle refined line)
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
    if (lastScore >= 45) strokeColor = '#f59e0b';
    if (lastScore >= 70) strokeColor = '#f43f5e';

    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    const lastX = (points.length - 1) * step;
    const lastY = height - (lastScore / 100) * (height - 16) - 8;
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
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
          REFINED IDENTITY VERDICT CARD (Calm, Elegant Surface)
         ========================================================================= */}
      <div
        className="glass-card"
        style={{
          border: isMe
            ? '1px solid rgba(16, 185, 129, 0.4)'
            : isIntruder
            ? '1px solid rgba(244, 63, 94, 0.4)'
            : isDrift
            ? '1px solid rgba(245, 158, 11, 0.4)'
            : '1px solid var(--border-subtle)',
          background: isMe
            ? 'rgba(16, 185, 129, 0.04)'
            : isIntruder
            ? 'rgba(244, 63, 94, 0.05)'
            : isDrift
            ? 'rgba(245, 158, 11, 0.04)'
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
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {isMe ? (
                <UserCheck size={26} color="#10b981" />
              ) : isIntruder ? (
                <UserX size={26} color="#f43f5e" />
              ) : isDrift ? (
                <ShieldAlert size={26} color="#f59e0b" />
              ) : (
                <Terminal size={26} color="#94a3b8" />
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                BIOMETRIC IDENTITY VERIFICATION
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em', marginTop: '0.15rem' }}>
                {isMe ? (
                  <span style={{ color: 'var(--accent-success)' }}>Identity Confirmed: {ownerName}</span>
                ) : isIntruder ? (
                  <span style={{ color: 'var(--accent-danger)' }}>Unrecognized Operator (Intruder Flagged)</span>
                ) : isDrift ? (
                  <span style={{ color: 'var(--accent-warning)' }}>Cadence Variation Detected</span>
                ) : (
                  <span style={{ color: 'var(--text-primary)' }}>Type 5+ characters to evaluate identity</span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {isMe ? (
                  <>Keystroke hold times and rhythm closely align with {ownerName}'s habitual motor pattern (<strong>{100 - riskScore}% confidence</strong>).</>
                ) : isIntruder ? (
                  <>Keystroke cadence deviates significantly ({riskScore}% anomaly) from {ownerName}'s enrolled profile.</>
                ) : isDrift ? (
                  <>Typing speed has minor drift. Possible fatigue or cold hands.</>
                ) : (
                  <>Type naturally in the console below. The neural timing model analyzes hold and transition latencies.</>
                )}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '120px' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              MATCH CONFIDENCE
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: isMe ? 'var(--accent-success)' : isIntruder ? 'var(--accent-danger)' : 'var(--text-primary)',
                lineHeight: 1,
                marginTop: '0.2rem'
              }}
            >
              {isAwaiting ? '--' : `${100 - riskScore}%`}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-success"
              onClick={onAutoCalibrate}
              title="Click after typing any sentence to adapt the baseline to your exact speed"
            >
              <Target size={15} /> Set as My Baseline
            </button>

            <button
              className="btn btn-danger"
              onClick={onQuickSimulateStranger}
              title="Test how the system detects a stranger typing"
            >
              <UserX size={15} /> Simulate Intruder
            </button>

            <button
              className="btn"
              onClick={onQuickVoiceVerify}
              title="Record 3s voice to test vocal verification right here"
            >
              <Mic size={15} /> Quick Voice Check
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Baseline Target: <strong style={{ color: 'var(--text-primary)' }}>{ownerName}</strong>
          </div>
        </div>

        {/* Quick Voice Notification Bar */}
        {quickVoiceState && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: quickVoiceState.isVerified ? 'var(--accent-success-subtle)' : 'var(--accent-danger-subtle)',
              border: `1px solid ${quickVoiceState.isVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Volume2 size={18} color={quickVoiceState.isVerified ? '#10b981' : '#f43f5e'} />
            <div>
              <strong style={{ fontSize: '0.82rem', color: quickVoiceState.isVerified ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                {quickVoiceState.isVerified ? 'Voice Confirmed: Matches Enrolled Voiceprint' : 'Voice Discrepancy: Mismatched Speaker'}
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
        
        {/* Left: Clean Matte Dark Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <Terminal size={16} />
                Continuous Keystroke Capture Console
              </div>
              <span className="card-tag">1,000 Hz SAMPLING</span>
            </div>

            <div className="terminal-window">
              <div className="terminal-titlebar">
                <div className="terminal-controls">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <span>operator@workstation: ~</span>
                <span>ZERO-TRUST AUTH</span>
              </div>
              <div className="terminal-body">
                <div className="terminal-prompt-box">
                  $ aegis-agent --monitor --profile="{ownerName}"
                </div>
                <textarea
                  id="react-terminal-input"
                  className="terminal-input-area"
                  style={{ minHeight: '135px' }}
                  placeholder="Type anything naturally here... (e.g., 'Verifying database credentials and system security access')"
                  onKeyDown={collector.handleKeyDown}
                  onKeyUp={collector.handleKeyUp}
                />
              </div>
            </div>

            <div className="sample-text-guide">
              <strong>💡 Paste example sentence:</strong>{' '}
              <span
                style={{ cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline' }}
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
                  <Sparkles size={14} /> Evaluate
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    const el = document.getElementById('react-terminal-input');
                    if (el) el.value = '';
                    onClear();
                  }}
                >
                  <RefreshCw size={14} /> Clear
                </button>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Keys: <strong style={{ color: 'var(--text-primary)' }}>{collector.keyCount}</strong> | Speed:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{features ? `${features.wpm} WPM` : '--'}</strong>
              </div>
            </div>
          </div>

          {/* Keystroke Oscilloscope */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>📊</span> Real-Time Key Hold Duration Stream
              </div>
              <span className="card-tag">SUB-MS DWELL</span>
            </div>
            <div className="canvas-wrapper">
              <canvas ref={keystrokeCanvasRef} width={700} height={110} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)'
              }}
            >
              <span>Height: Key Depress Duration</span>
              <span>Spacing: Release-to-Press Latency</span>
              <span>Green: Regular | Amber: Hesitant | Red: Outlier</span>
            </div>
          </div>
        </div>

        {/* Right: Biometric Parameters Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <ShieldCheck size={16} /> Observed Parameters vs {ownerName}
              </div>
              <span className="card-tag">TELEMETRY</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="metric-row">
                <span className="metric-label">Key Hold Duration (Dwell):</span>
                <span className="metric-value">
                  {features ? `${features.dwell_mean} ms` : '-- ms'}{' '}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    (Baseline: {activeProfile?.keystroke_baseline?.dwell_mean || 110} ms)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Transition Latency (Flight):</span>
                <span className="metric-value">
                  {features ? `${features.flight_mean} ms` : '-- ms'}{' '}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    (Baseline: {activeProfile?.keystroke_baseline?.flight_mean || 145} ms)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Rhythm Stability:</span>
                <span className="metric-value">
                  {features ? (features.rhythm_cv < 0.4 ? 'Normal Consistency' : 'Erratic Pacing') : '--'}
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Typing Velocity:</span>
                <span className="metric-value">
                  {features ? `${features.wpm} WPM` : '-- WPM'}{' '}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    (Baseline: {activeProfile?.keystroke_baseline?.wpm || 58} WPM)
                  </span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Correction Rate:</span>
                <span className="metric-value">
                  {features ? `${Math.round(features.backspace_rate * 100)}%` : '--%'}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                System Assessment:
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {assessment?.recommendation || 'Continuous authentication passing.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-danger" onClick={onQuarantine} style={{ flex: 1 }}>
                <AlertOctagon size={14} /> Quarantine
              </button>
              <button className="btn" onClick={onStepUp} style={{ flex: 1 }}>
                <KeyRound size={14} /> Step-Up MFA
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
              <canvas ref={timelineCanvasRef} width={400} height={100} />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
