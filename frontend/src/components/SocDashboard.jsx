import React from 'react';
import { Shield, Download, Trash2, AlertCircle } from 'lucide-react';
import { clearAuditLogs } from '../services/api';

export default function SocDashboard({ logs, onLogsUpdated, showToast }) {
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `aegis_forensic_audit_${Date.now()}.json`);
    dlAnchor.click();
    showToast('Forensic audit log exported to JSON.', 'success');
  };

  const handleClear = async () => {
    try {
      await clearAuditLogs();
      onLogsUpdated();
      showToast('SOC incident logs cleared.', 'info');
    } catch (err) {
      showToast('Failed to clear logs: ' + err.message, 'error');
    }
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <Shield size={18} /> Security Operations Center (SOC) - Continuous Biometric SIEM Log
        </div>
        <div className="btn-group">
          <button className="btn" onClick={handleExport}>
            <Download size={14} /> Export Forensic Audit (JSON)
          </button>
          <button className="btn btn-danger" onClick={handleClear}>
            <Trash2 size={14} /> Clear Logs
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Real-time incident response log. All behavioral anomalies, MITRE ATT&CK vectors, and biometric discrepancies
        are cataloged for digital forensics.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="log-stream-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>EVENT TYPE</th>
              <th>RISK INDEX</th>
              <th>KEYSTROKE DELTA</th>
              <th>VOICE DELTA</th>
              <th>MITRE ATT&CK</th>
              <th>ENFORCEMENT ACTION</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                  No incidents logged yet. Continuous telemetry active.
                </td>
              </tr>
            ) : (
              logs.slice(0, 20).map((log) => {
                let badgeClass = 'badge-info';
                if (log.risk_score >= 50) badgeClass = 'badge-warn';
                if (log.risk_score >= 75) badgeClass = 'badge-danger';

                return (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{log.timestamp}</td>
                    <td>
                      <span className={`log-badge ${badgeClass}`}>{log.level}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{log.risk_score}%</td>
                    <td>{log.dwell_delta}</td>
                    <td>{log.voice_delta}</td>
                    <td>
                      <span className="log-badge badge-mitre">{log.mitre}</span>
                    </td>
                    <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{log.action}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
