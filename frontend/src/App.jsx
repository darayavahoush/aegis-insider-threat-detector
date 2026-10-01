import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ContinuousTerminal from './components/ContinuousTerminal';
import VoiceConsole from './components/VoiceConsole';
import EnrollmentWizard from './components/EnrollmentWizard';
import AdversarySandbox from './components/AdversarySandbox';
import SocDashboard from './components/SocDashboard';
import ArchitectureDoc from './components/ArchitectureDoc';

import { useKeystrokeCollector } from './hooks/useKeystrokeCollector';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import {
  fetchProfiles,
  fetchProfileDetails,
  evaluateTelemetry,
  fetchAuditLogs,
  quarantineSession,
  triggerStepUp
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('tab-terminal');
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('sarah_vance');
  const [activeProfile, setActiveProfile] = useState(null);

  const [assessment, setAssessment] = useState({
    risk_score: 0,
    level: 'TRUSTED',
    status_class: 'status-trusted',
    recommendation: 'Continuous authentication verified. Session permitted.',
    breakdown: { keystroke_anomaly: 0, voice_anomaly: null, mouse_anomaly: 5 },
    details: { keystroke: {}, voice: {} },
    mitre_tags: []
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [simulatedVoice, setSimulatedVoice] = useState(null);

  const collector = useKeystrokeCollector();
  const voiceRecorder = useVoiceRecorder();

  const debounceTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  // Load initial profiles & logs
  useEffect(() => {
    async function init() {
      try {
        const plist = await fetchProfiles();
        setProfiles(plist);
        if (plist.length > 0) {
          const detail = await fetchProfileDetails(selectedProfileId);
          setActiveProfile(detail);
        }
        const logs = await fetchAuditLogs();
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to initialize API data:', err);
      }
    }
    init();
  }, []);

  // Update profile details on change
  const handleSelectProfile = async (id) => {
    setSelectedProfileId(id);
    try {
      const detail = await fetchProfileDetails(id);
      setActiveProfile(detail);
      showToast(`Active baseline profile: ${detail.name}`, 'info');
      triggerEvaluation(null, detail.id);
    } catch (err) {
      showToast('Error switching profile: ' + err.message, 'error');
    }
  };

  // Evaluation trigger to FastAPI
  const triggerEvaluation = useCallback(
    async (overrideFeatures = null, profileIdOverride = null) => {
      const pId = profileIdOverride || selectedProfileId;
      const features = overrideFeatures || collector.getFeatures();

      if (!features && !simulatedVoice) return;

      const payload = {
        profile_id: pId,
        keystrokes: features,
        voice: simulatedVoice || null,
        mouse_context: { anomaly_score: 0.05 }
      };

      try {
        const result = await evaluateTelemetry(payload);
        setAssessment(result);
        const logs = await fetchAuditLogs();
        setAuditLogs(logs);
      } catch (err) {
        console.error('FastAPI evaluation failed:', err);
      }
    },
    [selectedProfileId, collector, simulatedVoice]
  );

  // Debounce typing evaluation
  useEffect(() => {
    if (collector.keyCount >= 3) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        triggerEvaluation();
      }, 500);
    }
  }, [collector.keyCount, triggerEvaluation]);

  // Fast Actions
  const handleQuarantine = async () => {
    try {
      await quarantineSession(selectedProfileId);
      setAssessment((prev) => ({
        ...prev,
        risk_score: 100,
        level: 'CRITICAL_THREAT',
        status_class: 'status-critical',
        recommendation: 'MANUAL SOC QUARANTINE: Session terminated and workstation isolated.'
      }));
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
      showToast('🚨 WORKSTATION QUARANTINED: Active session revoked by SOC.', 'error');
    } catch (err) {
      showToast('Quarantine request failed: ' + err.message, 'error');
    }
  };

  const handleStepUp = async () => {
    try {
      await triggerStepUp(selectedProfileId);
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
      showToast('🔑 STEP-UP CHALLENGE ISSUED: Voice / FIDO2 prompt sent to operator.', 'warn');
    } catch (err) {
      showToast('Step-up challenge failed: ' + err.message, 'error');
    }
  };

  // Voice simulations
  const handleSimulateValidVoice = () => {
    const vBase = activeProfile?.voice_baseline || { pitch_mean: 195, centroid_mean: 1740 };
    const valid = {
      pitch_mean: vBase.pitch_mean - 3,
      pitch_std: 15,
      centroid_mean: vBase.centroid_mean,
      rms_mean: 0.22,
      zcr_mean: 0.08
    };
    setSimulatedVoice(valid);
    showToast('Legitimate voice acoustic signature simulated.', 'success');
    triggerEvaluation(null, selectedProfileId);
  };

  const handleSimulateSpoofVoice = () => {
    const spoof = {
      pitch_mean: 95, // 100Hz mismatch
      pitch_std: 12,
      centroid_mean: 1100,
      rms_mean: 0.12,
      zcr_mean: 0.045
    };
    setSimulatedVoice(spoof);
    showToast('Voice spoof / deepfake scenario injected!', 'error');
    triggerEvaluation(null, selectedProfileId);
  };

  // Scenario injection
  const handleInjectScenario = (scenario) => {
    setSimulatedVoice(scenario.payload.voice);
    triggerEvaluation(scenario.payload.keystrokes, selectedProfileId);
    showToast(`Adversary scenario injected: ${scenario.title}`, 'warn');
    setActiveTab('tab-terminal');
  };

  const handleProfileEnrolled = async (newProfile) => {
    const plist = await fetchProfiles();
    setProfiles(plist);
    setSelectedProfileId(newProfile.id);
    setActiveProfile(newProfile);
    setActiveTab('tab-terminal');
  };

  return (
    <div>
      <Header
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        onSelectProfile={handleSelectProfile}
        riskScore={assessment.risk_score}
        statusLevel={assessment.level}
        keyCount={collector.keyCount}
      />

      <nav className="nav-tabs">
        <div className="nav-container">
          <button
            className={`nav-tab-btn ${activeTab === 'tab-terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab-terminal')}
          >
            <span>🖥️</span> Continuous Workspace
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'tab-voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab-voice')}
          >
            <span>🎙️</span> Voice Acoustics
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'tab-enrollment' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab-enrollment')}
          >
            <span>👤</span> Biometric Enrollment
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'tab-simulation' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab-simulation')}
          >
            <span>🚨</span> Adversary Sandbox
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'tab-soc' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab-soc')}
          >
            <span>🛡️</span> SOC Incident Center
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'tab-architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab-architecture')}
          >
            <span>📐</span> Architecture & Math
          </button>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'tab-terminal' && (
          <ContinuousTerminal
            collector={collector}
            assessment={assessment}
            activeProfile={activeProfile}
            onEvaluate={() => triggerEvaluation()}
            onClear={() => {
              collector.reset();
              setSimulatedVoice(null);
              setAssessment({
                risk_score: 0,
                level: 'TRUSTED',
                status_class: 'status-trusted',
                recommendation: 'Terminal input reset. Continuous monitoring active.',
                breakdown: { keystroke_anomaly: 0, voice_anomaly: null, mouse_anomaly: 5 },
                details: { keystroke: {}, voice: {} },
                mitre_tags: []
              });
              showToast('Terminal and behavioral telemetry reset.', 'info');
            }}
            onQuarantine={handleQuarantine}
            onStepUp={handleStepUp}
          />
        )}

        {activeTab === 'tab-voice' && (
          <VoiceConsole
            recorder={voiceRecorder}
            activeProfile={activeProfile}
            voiceAnomaly={assessment.breakdown?.voice_anomaly}
            onSimulateValid={handleSimulateValidVoice}
            onSimulateSpoof={handleSimulateSpoofVoice}
          />
        )}

        {activeTab === 'tab-enrollment' && (
          <EnrollmentWizard onProfileEnrolled={handleProfileEnrolled} showToast={showToast} />
        )}

        {activeTab === 'tab-simulation' && (
          <AdversarySandbox onInjectScenario={handleInjectScenario} />
        )}

        {activeTab === 'tab-soc' && (
          <SocDashboard
            logs={auditLogs}
            onLogsUpdated={async () => {
              const logs = await fetchAuditLogs();
              setAuditLogs(logs);
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'tab-architecture' && <ArchitectureDoc />}
      </main>

      {/* Toast Notification Container */}
      <div id="toast-container" style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--border-color)',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
            }}
          >
            <span>{t.type === 'error' ? '🚨' : t.type === 'warn' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
