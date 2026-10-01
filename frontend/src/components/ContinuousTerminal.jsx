import React, { useRef, useEffect } from 'react';
import { Terminal, ShieldAlert, KeyRound, Sparkles, RefreshCw, AlertOctagon } from 'lucide-react';

export default function ContinuousTerminal({
  collector,
  assessment,
  activeProfile,
  onEvaluate,
  onClear,
  onQuarantine,
  onStepUp
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

    // Baseline axis
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();

    const pulses = collector.pulseData;
    if (pulses.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '11px Fira Code, monospace';
      ctx.fillText('Awaiting live keystroke events... Type into the terminal above.', 15, height / 2 + 4);
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
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      const label = p.key.length === 1 ? p.key : p.key.substring(0, 3);
      ctx.fillText(label, x, height - 6);

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${Math.round(p.dwell)}ms`, x, y - 4);
    });

    ctx.globalAlpha = 1.0;
  }, [collector.pulseData]);

  // Draw Continuous Risk Score Timeline
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

    // Threshold lines
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

    // Latest point glow
    const lastX = (points.length - 1) * step;
    const lastY = height - (lastScore / 100) * (height - 16) - 8;
    ctx.fillStyle = strokeColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = strokeColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [assessment]);

  const riskScore = assessment ? assessment.risk_score : 0;
  const features = collector.getFeatures();
  const ksdDetails = assessment?.details?.keystroke || {};

  const suggestedPrompt =
    'The quick brown fox jumps over the lazy dog and verifies cloud security credentials.';

  return (
    <div className="grid-workspace">
      {/* Left: Terminal & Oscilloscope */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Terminal size={18} />
              Defense Console & Continuous Keystroke Collector
            </div>
            <span className="card-tag">FASTAPI REAL-TIME STREAM</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            As you type, sub-millisecond timestamps capture your <strong>dwell time</strong> (key hold),{' '}
            <strong>flight time</strong> (release-to-press), <strong>digraph transitions</strong>, and{' '}
            <strong>rhythm cadence</strong>.
          </p>

          <div className="terminal-window">
            <div className="terminal-titlebar">
              <div className="terminal-controls">
                <span className="terminal-dot dot-red"></span>
                <span className="terminal-dot dot-yellow"></span>
                <span className="terminal-dot dot-green"></span>
              </div>
              <span>operator@bastion-01: /secure/ops</span>
              <span>ENC: TLS 1.3 // ZERO-TRUST</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-prompt-box">
                $ aegis-biometric-agent --monitor-continuous --profile={activeProfile?.id || 'sarah_vance'}
              </div>
              <textarea
                id="react-terminal-input"
                className="terminal-input-area"
                placeholder="Type here to test continuous authentication... (e.g. 'sudo iptables -A INPUT -s 10.0.4.15 -j DROP' or type naturally to test your behavioral cadence)"
                onKeyDown={collector.handleKeyDown}
                onKeyUp={collector.handleKeyUp}
              />
            </div>
          </div>

          <div className="sample-text-guide">
            <strong>💡 Suggested prompt to type:</strong>{' '}
            <span
              style={{ cursor: 'pointer', color: 'var(--accent-cyan)', textDecoration: 'underline' }}
              onClick={() => {
                const el = document.getElementById('react-terminal-input');
                if (el) {
                  el.value = suggestedPrompt;
                  el.focus();
                }
              }}
            >
              {suggestedPrompt}
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
                <Sparkles size={14} /> Evaluate Anomaly Now
              </button>
              <button
                className="btn"
                onClick={() => {
                  const el = document.getElementById('react-terminal-input');
                  if (el) el.value = '';
                  onClear();
                }}
              >
                <RefreshCw size={14} /> Reset Input
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Keys Buffered:{' '}
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{collector.keyCount}</span>
            </div>
          </div>
        </div>

        {/* Keystroke Oscilloscope */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>📊</span> Live Keystroke Dwell & Cadence Oscilloscope
            </div>
            <span className="card-tag">SUB-MS DYNAMICS</span>
          </div>
          <div className="canvas-wrapper">
            <canvas ref={keystrokeCanvasRef} width={700} height={130} />
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
            <span>Height = Dwell Time (ms)</span>
            <span>Spacing = Flight Latency (ms)</span>
            <span>Green: Normal (70-150ms) | Amber: Slow (&gt;170ms) | Red: Outlier</span>
          </div>
        </div>
      </div>

      {/* Right: Threat Gauge & Biometric Telemetry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <ShieldAlert size={18} /> Threat Assessment & Risk Index
            </div>
            <span className="card-tag">{assessment?.level || 'TRUSTED'}</span>
          </div>

          <div className="threat-gauge-box">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              COMPOSITE THREAT PROBABILITY
            </div>
            <div
              className="gauge-val-big"
              style={{
                color:
                  riskScore >= 75
                    ? 'var(--accent-danger)'
                    : riskScore >= 50
                    ? 'var(--accent-warning)'
                    : 'var(--accent-emerald)'
              }}
            >
              {riskScore}%
            </div>
            <div>
              <span className={`threat-status-label ${assessment?.status_class || 'status-trusted'}`}>
                {assessment?.level || 'TRUSTED // AUTHENTICATED'}
              </span>
            </div>

            <div className="meter-bar-container">
              <div className="meter-bar-fill" style={{ width: `${riskScore}%` }}></div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                marginTop: '0.25rem'
              }}
            >
              <span>0% SAFE</span>
              <span>25% DRIFT</span>
              <span>50% SUSPICIOUS</span>
              <span>75% CRITICAL</span>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div className="metric-row">
              <span className="metric-label">Keystroke Dynamics Delta:</span>
              <span className="metric-value">
                {ksdDetails.composite_z ? `${ksdDetails.composite_z}σ` : '0.0σ'} (
                {assessment?.breakdown?.keystroke_anomaly || 0}% Anomaly)
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Average Dwell Time:</span>
              <span className="metric-value">{features ? `${features.dwell_mean} ms` : '-- ms'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Average Flight Latency:</span>
              <span className="metric-value">{features ? `${features.flight_mean} ms` : '-- ms'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Rhythm Stability (CV):</span>
              <span className="metric-value">{features ? features.rhythm_cv : '--'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Typing Speed (WPM):</span>
              <span className="metric-value">{features ? `${features.wpm} WPM` : '-- WPM'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Backspace Rate:</span>
              <span className="metric-value">
                {features ? `${Math.round(features.backspace_rate * 100)} %` : '-- %'}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.25rem' }}>
              🛡️ SOC Recommendation:
            </div>
            <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {assessment?.recommendation || 'Normal behavioral rhythm detected. Continuous verification passing.'}
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

        {/* Risk Score Timeline */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>📈</span> Continuous Risk Trend Stream
            </div>
            <span className="card-tag">FASTAPI EVAL</span>
          </div>
          <div className="canvas-wrapper">
            <canvas ref={timelineCanvasRef} width={400} height={120} />
          </div>
        </div>

        {/* Digraph Latency Grid */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>🔡</span> Top Digraph Transition Latencies
            </div>
            <span className="card-tag">MUSCLE MEMORY</span>
          </div>
          <div className="digraph-grid">
            {Object.entries(activeProfile?.keystroke_baseline?.digraph_stats || {})
              .slice(0, 8)
              .map(([dg, stat]) => {
                const testMean = features?.digraph_stats?.[dg]?.mean || stat.mean;
                const isAnomalous = Math.abs(testMean - stat.mean) > 60;
                return (
                  <div key={dg} className="digraph-item">
                    <div className="digraph-name">
                      <span>'{dg}'</span>
                      <span style={{ color: isAnomalous ? 'var(--accent-danger)' : 'var(--accent-cyan)' }}>
                        {testMean}ms
                      </span>
                    </div>
                    <div className="digraph-bar">
                      <div
                        className="digraph-bar-fill"
                        style={{
                          width: `${Math.min(testMean / 3, 100)}%`,
                          background: isAnomalous ? 'var(--accent-danger)' : 'var(--accent-blue)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
