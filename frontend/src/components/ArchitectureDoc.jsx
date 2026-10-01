import React from 'react';
import { BookOpen } from 'lucide-react';

export default function ArchitectureDoc() {
  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <BookOpen size={18} /> Mathematical Modeling & Enterprise System Architecture
        </div>
        <span className="card-tag">FASTAPI + REACT ZERO-TRUST</span>
      </div>

      <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.05rem', margin: '1rem 0 0.5rem' }}>
        1. Keystroke Dynamics Mathematical Formulation
      </h3>
      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Keystroke dynamics quantifies habitual neuro-muscular typing cadences through temporal hardware intervals:
      </p>

      <div className="formula-box">
        <strong>Dwell Time (T_dwell):</strong> T_dwell(k) = t_keyup(k) - t_keydown(k)
        <br />
        <strong>Flight Time (T_flight / Release-to-Press):</strong> T_flight(k-1, k) = t_keydown(k) - t_keyup(k-1)
        <br />
        <strong>Digraph Latency (T_digraph / Press-to-Press):</strong> T_pp(k-1, k) = t_keydown(k) - t_keydown(k-1)
        <br />
        <strong>Rhythm Stability (CV):</strong> CV = σ_flight / μ_flight
      </div>

      <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.05rem', margin: '1.25rem 0 0.5rem' }}>
        2. Normalized Anomaly Distance (Standardized Multi-Variate Z-Scores)
      </h3>
      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        For each extracted feature vector component x_i, deviation from the enrolled baseline template (μ_i, σ_i) is computed:
      </p>

      <div className="formula-box">
        Z_i = |x_i - μ_base,i| / (σ_base,i + ε)
        <br />
        Z_composite = 0.35 * Z_dwell + 0.35 * Z_flight + 0.15 * Z_rhythm + 0.15 * (1/|D|) * Σ Z_dg(i,j)
        <br />
        Anomaly Probability A_ksd = 1 - exp(-0.5 * Z_composite)
      </div>

      <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.05rem', margin: '1.25rem 0 0.5rem' }}>
        3. Acoustic Signal DSP & Voice Biometrics
      </h3>
      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Using browser Web Audio API FFT analysis, vocal cords and vocal tract physical characteristics are estimated:
      </p>

      <div className="formula-box">
        <strong>Fundamental Pitch (F0 Autocorrelation):</strong> R_xx(τ) = Σ x[n] x[n+τ] → F0 = f_s / τ_max
        <br />
        <strong>Spectral Centroid (Timbre Brightness):</strong> Centroid = Σ (f_k * |X[k]|) / Σ |X[k]|
        <br />
        <strong>Zero-Crossing Rate (ZCR):</strong> ZCR = (1 / 2N) * Σ |sgn(x[n]) - sgn(x[n-1])|
      </div>

      <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.05rem', margin: '1.25rem 0 0.5rem' }}>
        4. Multi-Modal Risk Fusion & Adaptive Thresholding
      </h3>
      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        The FastAPI Threat Engine synthesizes all modalities into an authoritative threat risk index:
      </p>

      <div className="formula-box">
        Risk(t) = 0.55 * A_keystroke + 0.35 * A_voice + 0.10 * A_mouseContext
        <br />
        Thresholds: &lt;25% → TRUSTED, 25-50% → DRIFT, 50-75% → STEP-UP MFA, &gt;75% → QUARANTINE
      </div>

      <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.05rem', margin: '1.25rem 0 0.5rem' }}>
        5. Privacy By Design (GDPR / Zero Keylogging Compliance)
      </h3>
      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Traditional keyloggers violate corporate privacy by recording characters typed. Aegis employs{' '}
        <strong>differential timing abstraction</strong>: it discards the text and only aggregates timing deltas, digraph
        durations, and non-reversible acoustic features. Even if telemetry is intercepted, the underlying passwords or
        confidential documents cannot be reconstructed.
      </p>
    </div>
  );
}
