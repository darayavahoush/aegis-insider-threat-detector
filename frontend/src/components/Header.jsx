import React from 'react';
import { Shield, User, Activity, Cpu } from 'lucide-react';

export default function Header({
  profiles,
  selectedProfileId,
  onSelectProfile,
  riskScore,
  statusLevel,
  keyCount
}) {
  const isDanger = statusLevel === 'CRITICAL_THREAT' || statusLevel === 'SUSPICIOUS_ANOMALY';
  const isVerified = statusLevel === 'TRUSTED' && keyCount >= 5;
  const isDrift = statusLevel === 'ELEVATED_DRIFT';

  return (
    <header className="executive-header">
      <div className="header-container">
        {/* Brand identity */}
        <div className="brand-wrapper">
          <div className="brand-logo-container">
            <Shield size={20} className="brand-shield-icon" />
          </div>
          <div>
            <div className="brand-title-group">
              <span className="brand-name">AEGIS</span>
              <span className="brand-badge">ZERO-TRUST BIOMETRICS</span>
            </div>
            <div className="brand-subtitle">
              Continuous Behavioral Insider Threat Defense
            </div>
          </div>
        </div>

        {/* Central & Right Controls */}
        <div className="header-telemetry">
          {/* Active Baseline Profile */}
          <div className="profile-select-container">
            <User size={14} className="profile-icon" />
            <span className="profile-label">BASELINE IDENTITY:</span>
            <select
              value={selectedProfileId}
              onChange={(e) => onSelectProfile(e.target.value)}
              className="profile-dropdown"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.id === 'ananya_sridhar' ? '(Enrolled)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Model indicator */}
          <div className="engine-badge-pill">
            <Cpu size={13} style={{ color: '#818cf8' }} />
            <span>TypeNet &middot; LangGraph</span>
          </div>

          {/* Verification Status Badge */}
          <div
            className={`status-indicator-pill ${
              isDanger
                ? 'pill-danger'
                : isDrift
                ? 'pill-drift'
                : isVerified
                ? 'pill-trusted'
                : 'pill-neutral'
            }`}
          >
            <span className="status-dot-pulse"></span>
            <span className="status-text">
              {isDanger ? (
                <>INTRUDER DETECTED ({riskScore}% Risk)</>
              ) : isDrift ? (
                <>CADENCE DRIFT ({riskScore}% Risk)</>
              ) : isVerified ? (
                <>IDENTITY VERIFIED ({100 - riskScore}% Match)</>
              ) : (
                <>READY &mdash; AWAITING INPUT</>
              )}
            </span>
          </div>

          {/* Keystroke counter */}
          <div className="counter-pill">
            <Activity size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="counter-label">KEYS:</span>
            <span className="counter-value">{keyCount}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
