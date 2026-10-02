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
  calibrateProfile,
  fetchAuditLogs,
  quarantineSession,
  triggerStepUp
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('tab-terminal');
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('ananya_sridhar');
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
  const [quickVoiceState, setQuickVoiceState] = useState(null);

  const collector = useKeystrokeCollector();
  const voiceRecorder = useVoiceRecorder();

  const debounceTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Load initial profiles & logs
  useEffect(() => {
    async function init() {
      try {
        const plist = await fetchProfiles();
        setProfiles(plist);
        if (plist.length > 0) {
          const defaultId = plist.some((p) => p.id === 'ananya_sridhar') ? 'ananya_sridhar' : plist[0].id;
          setSelectedProfileId(defaultId);
          const detail = await fetchProfileDetails(defaultId);
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
      setQuickVoiceState(null);
      showToast(`Switched active baseline identity to: ${detail.name}`, 'info');
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
      }, 450);
    }
  }, [collector.keyCount, triggerEvaluation]);

  // 1-Click Auto-Calibrate (Teaches the model: "This is Me!")
  const handleAutoCalibrate = async () => {
    const feat = collector.getFeatures();
    if (!feat || feat.key_count < 5) {
      showToast('⚠️ Type at least 5 to 10 words into the terminal first so the system can measure your natural speed!', 'warn');
      return;
    }

    try {
      const res = await calibrateProfile({
        profile_id: selectedProfileId,
        keystrokes: feat,
        voice: simulatedVoice || null
      });

      setActiveProfile(res.profile);
      showToast(`🎯 Profile Calibrated! System now recognizes your natural hold (${feat.dwell_mean}ms) and speed (${feat.wpm} WPM).`, 'success');

      // Immediate re-evaluation with the newly updated baseline
      triggerEvaluation(feat, selectedProfileId);
    } catch (err) {
      showToast('Calibration failed: ' + err.message, 'error');
    }
  };

  // Quick Stranger / Intruder Simulation
  const handleQuickSimulateStranger = () => {
    const strangerFeatures = {
      key_count: 32,
      dwell_mean: 230,
      dwell_std: 75,
      flight_mean: 390,
      flight_std: 140,
      rhythm_cv: 0.62,
      wpm: 22,
      backspace_rate: 0.28,
      digraph_stats: {
        th: { mean: 320, count: 3 },
        he: { mean: 350, count: 2 },
        in: { mean: 300, count: 4 }
      },
      is_synthetic_bot: false
    };

    const el = document.getElementById('react-terminal-input');
    if (el) el.value = '[INTRUDER SIMULATION RUNNING] Stranger sitting at terminal typing slowly with unfamiliar jerky cadence...';

    triggerEvaluation(strangerFeatures, selectedProfileId);
    showToast(`🚨 Intruder Simulation Injected: Alarm tripped against ${activeProfile?.name || 'Owner'}!`, 'error');
  };

  // Quick Voice Verification from Continuous Terminal
  const handleQuickVoiceVerify = async () => {
    showToast('🎙️ Microphone active! Speak now: "My voice is my password, verify my clearance"', 'info');
    try {
      await voiceRecorder.startListening();
      setTimeout(async () => {
        const acoustic = voiceRecorder.stopListening();
        setSimulatedVoice(acoustic);

        const basePitch = activeProfile?.voice_baseline?.pitch_mean || 210;
        const pitchDelta = Math.abs(acoustic.pitch_mean - basePitch);
        const isVer = pitchDelta < 40;

        setQuickVoiceState({
          isVerified: isVer,
          message: isVer
            ? `Observed pitch ${acoustic.pitch_mean}Hz matches ${activeProfile?.name || 'your'} voice print!`
            : `Observed pitch ${acoustic.pitch_mean}Hz deviates from ${activeProfile?.name || 'your'} baseline (${basePitch}Hz)!`
        });

        showToast(
          isVer ? `✅ Voice Verified: Matches ${activeProfile?.name || 'You'}!` : '🚨 Voice Mismatch: Someone else is speaking!',
          isVer ? 'success' : 'error'
        );

        triggerEvaluation(null, selectedProfileId);
      }, 3500);
    } catch (e) {
      showToast('Voice capture error: ' + e.message, 'error');
    }
  };

  // 1-Click Save Voice Baseline
  const handleSaveVoiceBaseline = async (voiceProfile) => {
    try {
      const res = await calibrateProfile({
        profile_id: selectedProfileId,
        keystrokes: collector.getFeatures() || activeProfile.keystroke_baseline,
        voice: voiceProfile
      });
      setActiveProfile(res.profile);
      setQuickVoiceState({
        isVerified: true,
        message: `Your voice (${voiceProfile.pitch_mean}Hz pitch) has been saved as your enrolled baseline.`
      });
      showToast(`🎯 Voice baseline saved! Pitch ${voiceProfile.pitch_mean}Hz is now registered as your official voice.`, 'success');
      triggerEvaluation(null, selectedProfileId);
    } catch (e) {
      showToast('Failed to save voice baseline: ' + e.message, 'error');
    }
  };

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

  // Voice simulations in Voice tab
  const handleSimulateValidVoice = () => {
    const vBase = activeProfile?.voice_baseline || { pitch_mean: 210, centroid_mean: 1750 };
    const valid = {
      pitch_mean: vBase.pitch_mean - 4,
      pitch_std: 18,
      centroid_mean: vBase.centroid_mean,
      rms_mean: 0.22,
      zcr_mean: 0.08
    };
    setSimulatedVoice(valid);
    setQuickVoiceState({
      isVerified: true,
      message: `Simulated genuine speaker matches ${activeProfile?.name || 'Owner'}'s vocal cords.`
    });
    showToast('Legitimate voice acoustic signature simulated.', 'success');
    triggerEvaluation(null, selectedProfileId);
  };

  const handleSimulateSpoofVoice = () => {
    const spoof = {
      pitch_mean: 95, // Extreme mismatch
      pitch_std: 12,
      centroid_mean: 1100,
      rms_mean: 0.12,
      zcr_mean: 0.045
    };
    setSimulatedVoice(spoof);
    setQuickVoiceState({
      isVerified: false,
      message: `Voice spoof flagged: 115Hz deviation from ${activeProfile?.name || 'Owner'}'s vocal print.`
    });
    showToast('Voice spoof / deepfake scenario injected!', 'error');
    triggerEvaluation(null, selectedProfileId);
  };

  // Scenario injection from Sandbox
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
              setQuickVoiceState(null);
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
            onAutoCalibrate={handleAutoCalibrate}
            onQuickSimulateStranger={handleQuickSimulateStranger}
            onQuickVoiceVerify={handleQuickVoiceVerify}
            quickVoiceState={quickVoiceState}
          />
        )}

        {activeTab === 'tab-voice' && (
          <VoiceConsole
            recorder={voiceRecorder}
            activeProfile={activeProfile}
            voiceAnomaly={assessment.breakdown?.voice_anomaly}
            onSimulateValid={handleSimulateValidVoice}
            onSimulateSpoof={handleSimulateSpoofVoice}
            onSaveVoiceBaseline={handleSaveVoiceBaseline}
            showToast={showToast}
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
      <div
        id="toast-container"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}
      >
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
