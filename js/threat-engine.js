/**
 * AEGIS - Insider Threat & Multi-Modal Behavioral Fusion Engine
 * Fuses keystroke dynamics, voice biometrics, and session context into a unified threat risk index.
 * Maps anomalous vectors to the MITRE ATT&CK framework for SOC alert triage.
 */

class ThreatEngine {
  constructor() {
    this.threatHistory = [];
    this.currentRiskScore = 0; // 0 to 100
    this.currentLevel = 'TRUSTED';
    this.weights = {
      keystroke: 0.55,
      voice: 0.35,
      mouseContext: 0.10
    };
  }

  evaluate({ keystrokeResult, voiceResult, mouseContextResult }) {
    let weightedSum = 0;
    let totalWeight = 0;

    // 1. Keystroke Anomaly component
    if (keystrokeResult && typeof keystrokeResult.anomalyScore === 'number') {
      const kWeight = this.weights.keystroke;
      weightedSum += keystrokeResult.anomalyScore * kWeight;
      totalWeight += kWeight;
    }

    // 2. Voice Biometrics component (if recorded/active)
    if (voiceResult && typeof voiceResult.anomalyScore === 'number' && voiceResult.active) {
      const vWeight = this.weights.voice;
      weightedSum += voiceResult.anomalyScore * vWeight;
      totalWeight += vWeight;
    }

    // 3. Mouse & Context component
    if (mouseContextResult && typeof mouseContextResult.anomalyScore === 'number') {
      const mWeight = this.weights.mouseContext;
      weightedSum += mouseContextResult.anomalyScore * mWeight;
      totalWeight += mWeight;
    }

    // Normalized combined anomaly [0.0 - 1.0]
    const fusedAnomaly = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
    const riskScore = Math.round(fusedAnomaly * 100);
    this.currentRiskScore = riskScore;

    // Determine Classification Level
    let level = 'TRUSTED';
    let statusClass = 'status-trusted';
    let recommendation = 'Allow uninterrupted session execution.';

    if (riskScore >= 75) {
      level = 'CRITICAL_THREAT';
      statusClass = 'status-critical';
      recommendation = 'TERMINATE SESSION or QUARANTINE: Probable unauthorized impersonation / hijacked credential.';
    } else if (riskScore >= 50) {
      level = 'SUSPICIOUS_ANOMALY';
      statusClass = 'status-drift';
      recommendation = 'TRIGGER STEP-UP CHALLENGE: Voice biometric or Hardware MFA token verification required.';
    } else if (riskScore >= 26) {
      level = 'ELEVATED_DRIFT';
      statusClass = 'status-drift';
      recommendation = 'MONITOR: Minor typing cadence drift (fatigue or typing posture change).';
    }

    this.currentLevel = level;

    // MITRE ATT&CK Mapping
    const mitreTags = [];
    if (keystrokeResult?.isSyntheticBot) {
      mitreTags.push({
        id: 'T1056.001',
        name: 'Keylogging / Synthetic Keystroke Injection',
        description: 'Zero-variance key timing indicates automated keystroke injection script or replay attack.'
      });
    }

    if (riskScore >= 70) {
      mitreTags.push({
        id: 'T1078.003',
        name: 'Valid Accounts: Local Accounts Hijacking',
        description: 'Authorized credential being operated by distinct physical individual with mismatched behavioral cadence.'
      });
    }

    if (voiceResult?.anomalyScore > 0.65) {
      mitreTags.push({
        id: 'T1056',
        name: 'Spoofed Audio / Speaker Discrepancy',
        description: 'Voiceprint acoustic fundamental frequency mismatch against enrolled employee identity.'
      });
    }

    const assessment = {
      timestamp: new Date().toISOString(),
      riskScore,
      fusedAnomaly: parseFloat(fusedAnomaly.toFixed(3)),
      level,
      statusClass,
      recommendation,
      mitreTags,
      breakdown: {
        keystrokeAnomaly: keystrokeResult ? Math.round(keystrokeResult.anomalyScore * 100) : 0,
        voiceAnomaly: (voiceResult && voiceResult.active) ? Math.round(voiceResult.anomalyScore * 100) : null,
        mouseAnomaly: mouseContextResult ? Math.round(mouseContextResult.anomalyScore * 100) : 0
      }
    };

    this.threatHistory.unshift(assessment);
    if (this.threatHistory.length > 50) this.threatHistory.pop();

    return assessment;
  }
}

if (typeof module !== 'undefined') module.exports = ThreatEngine;
if (typeof window !== 'undefined') window.ThreatEngine = ThreatEngine;
