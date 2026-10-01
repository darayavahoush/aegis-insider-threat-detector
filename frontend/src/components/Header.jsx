import React from 'react';
import { Shield, Activity, UserCheck, AlertTriangle } from 'lucide-react';

export default function Header({ profiles, selectedProfileId, onSelectProfile, riskScore, statusLevel, keyCount }) {
  const isDanger = statusLevel === 'CRITICAL_THREAT' || statusLevel === 'SUSPICIOUS_ANOMALY';

  return (
    <header>
      <div className="header-container">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Shield size={24} color="#00f0ff" />
          </div>
          <div>
            <div className="brand-title">AEGIS // ZERO-TRUST BIOMETRICS</div>
            <div className="brand-subtitle">FASTAPI + REACT CONTINUOUS INSIDER THREAT DETECTOR</div>
          </div>
        </div>

        <div className="header-telemetry">
          <div className="telemetry-pill">
            <UserCheck size={14} color="#64748b" />
            <span style={{ color: 'var(--text-muted)' }}>TARGET:</span>
            <select
              value={selectedProfileId}
              onChange={(e) => onSelectProfile(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#111827' }}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div className={`telemetry-pill ${isDanger ? 'status-danger' : 'status-safe'}`}>
            <span className="pill-dot"></span>
            <span>
              {isDanger
                ? `ALERT: THREAT DETECTED (${riskScore}% RISK)`
                : `AUTHENTICATED (${riskScore}% RISK)`}
            </span>
          </div>

          <div className="telemetry-pill">
            <Activity size={14} color="#64748b" />
            <span style={{ color: 'var(--text-muted)' }}>KEYS:</span>
            <span style={{ color: 'var(--text-primary)' }}>{keyCount}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
