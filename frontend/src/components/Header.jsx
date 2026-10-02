import React from 'react';
import { Shield, UserCheck, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';

export default function Header({ profiles, selectedProfileId, onSelectProfile, riskScore, statusLevel, keyCount }) {
  const isDanger = statusLevel === 'CRITICAL_THREAT' || statusLevel === 'SUSPICIOUS_ANOMALY';
  const isVerified = statusLevel === 'TRUSTED' && keyCount >= 5;

  return (
    <header>
      <div className="header-container">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Shield size={24} color="#00f0ff" />
          </div>
          <div>
            <div className="brand-title">AEGIS // BIOMETRIC IDENTITY DEFENDER</div>
            <div className="brand-subtitle">CONTINUOUS BEHAVIORAL INSIDER THREAT DETECTOR</div>
          </div>
        </div>

        <div className="header-telemetry">
          {/* Identity Selector */}
          <div className="telemetry-pill" style={{ border: '1px solid rgba(0, 240, 255, 0.4)' }}>
            <UserCheck size={15} color="#00f0ff" />
            <span style={{ color: 'var(--text-muted)' }}>ENROLLED OWNER:</span>
            <select
              value={selectedProfileId}
              onChange={(e) => onSelectProfile(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#111827', color: '#fff' }}>
                  {p.name} {p.id === 'ananya_sridhar' ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Simple Human-Readable Status Badge */}
          <div className={`telemetry-pill ${isDanger ? 'status-danger' : 'status-safe'}`} style={{ padding: '0.45rem 0.9rem' }}>
            <span className="pill-dot"></span>
            <span style={{ fontWeight: 700 }}>
              {isDanger ? (
                <>🚨 INTRUDER ALERT: NOT YOU ({riskScore}% Risk)</>
              ) : isVerified ? (
                <>✅ VERIFIED: IT'S YOU ({100 - riskScore}% Match)</>
              ) : (
                <>⌨️ READY — TYPE TO IDENTIFY</>
              )}
            </span>
          </div>

          {/* Key Counter */}
          <div className="telemetry-pill">
            <span style={{ color: 'var(--text-muted)' }}>KEYS LOGGED:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{keyCount}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
