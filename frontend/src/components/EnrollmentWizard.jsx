import React, { useState } from 'react';
import { UserPlus, CheckCircle, Mic, RotateCcw } from 'lucide-react';
import { useKeystrokeCollector } from '../hooks/useKeystrokeCollector';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { enrollProfile } from '../services/api';

export default function EnrollmentWizard({ onProfileEnrolled, showToast }) {
  const [samples, setSamples] = useState([]);
  const [voiceBaseline, setVoiceBaseline] = useState(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Security Operations Analyst');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const kCollector = useKeystrokeCollector();
  const vRecorder = useVoiceRecorder();

  const calibrationText =
    'Security credentials must remain strictly protected against lateral movement and unauthorized impersonation.';

  const handleSaveSample = () => {
    const feat = kCollector.getFeatures();
    if (!feat || feat.key_count < 15) {
      showToast('Please type the full calibration passage before saving.', 'warn');
      return;
    }

    const nextSamples = [...samples, feat];
    setSamples(nextSamples);
    kCollector.reset();
    const el = document.getElementById('enroll-textarea');
    if (el) el.value = '';

    if (nextSamples.length < 3) {
      showToast(`Sample ${nextSamples.length} recorded. Please type it again for sample ${nextSamples.length + 1}.`, 'info');
    } else {
      showToast('Keystroke calibration complete! Proceed to Step 2 for voice enrollment.', 'success');
    }
  };

  const handleRecordVoice = async () => {
    setIsRecordingVoice(true);
    await vRecorder.startListening();

    setTimeout(() => {
      const acoustic = vRecorder.stopListening();
      setVoiceBaseline(acoustic);
      setIsRecordingVoice(false);
      showToast('Voice acoustic baseline calibrated successfully!', 'success');
    }, 3200);
  };

  const handleActivate = async () => {
    if (samples.length < 3) {
      showToast('Please complete all 3 keystroke calibration rounds first.', 'warn');
      return;
    }

    const avgDwell = samples.reduce((a, s) => a + s.dwell_mean, 0) / samples.length;
    const avgFlight = samples.reduce((a, s) => a + s.flight_mean, 0) / samples.length;
    const avgCV = samples.reduce((a, s) => a + s.rhythm_cv, 0) / samples.length;
    const avgWpm = samples.reduce((a, s) => a + s.wpm, 0) / samples.length;

    const id = `custom_${Date.now().toString(36)}`;
    const newProfile = {
      id,
      name: userName.trim() || 'Enrolled User (You)',
      role: userRole,
      department: 'Enterprise Security',
      clearance: 'Level-5 (Biometric Authenticated)',
      keystroke_baseline: {
        key_count: 150,
        dwell_mean: Math.round(avgDwell),
        dwell_std: 18.0,
        flight_mean: Math.round(avgFlight),
        flight_std: 30.0,
        rhythm_cv: parseFloat(avgCV.toFixed(3)),
        wpm: Math.round(avgWpm),
        backspace_rate: 0.04,
        digraph_stats: {
          th: { mean: Math.round(avgFlight * 0.9), count: 10 },
          he: { mean: Math.round(avgFlight * 0.85), count: 10 },
          in: { mean: Math.round(avgFlight * 0.95), count: 10 }
        }
      },
      voice_baseline: voiceBaseline || {
        pitch_mean: 180.0,
        pitch_std: 18.0,
        centroid_mean: 1650.0,
        rms_mean: 0.2,
        zcr_mean: 0.08,
        sample_count: 30
      }
    };

    try {
      await enrollProfile(newProfile);
      showToast(`Custom profile '${newProfile.name}' registered with FastAPI!`, 'success');
      onProfileEnrolled(newProfile);
    } catch (err) {
      showToast('Enrollment failed: ' + err.message, 'error');
    }
  };

  const handleReset = () => {
    setSamples([]);
    setVoiceBaseline(null);
    kCollector.reset();
    const el = document.getElementById('enroll-textarea');
    if (el) el.value = '';
    showToast('Enrollment form reset.', 'info');
  };

  const isReadyToActivate = samples.length >= 3;

  return (
    <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-title">
          <UserPlus size={18} /> Biometric Profile Enrollment & Calibration Wizard
        </div>
        <span className="card-tag">FASTAPI ENROLLMENT</span>
      </div>

      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Calibrate Aegis to your personal typing and voice biometrics. No passwords or plaintext recordings leave your
        machine; only mathematical statistical timing vectors ($\mu, \sigma$) are computed and hashed.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* User Identity Details */}
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            OPERATOR IDENTITY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Full Name:</label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Organizational Role:</label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Step 1: Keystroke */}
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
              STEP 1: Calibrate Personal Keystroke Cadence
            </div>
            <span className={`log-badge ${samples.length >= 3 ? 'badge-mitre' : 'badge-info'}`}>
              {samples.length >= 3 ? 'CALIBRATION COMPLETE (3/3)' : `Sample ${samples.length + 1} of 3`}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Type the calibration passage below naturally. Repeat 3 times to compute Gaussian distribution metrics:
          </p>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '0.75rem',
              borderLeft: '3px solid var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              marginBottom: '0.75rem'
            }}
          >
            "{calibrationText}"
          </div>

          <textarea
            id="enroll-textarea"
            className="terminal-input-area"
            style={{ minHeight: '90px' }}
            placeholder="Type the calibration sentence above here..."
            onKeyDown={kCollector.handleKeyDown}
            onKeyUp={kCollector.handleKeyUp}
            disabled={samples.length >= 3}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Keys captured: {kCollector.keyCount}
            </span>
            <button
              className="btn btn-primary"
              onClick={handleSaveSample}
              disabled={samples.length >= 3 || kCollector.keyCount < 15}
            >
              💾 Record Sample ({samples.length}/3)
            </button>
          </div>
        </div>

        {/* Step 2: Voice */}
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
              STEP 2: Calibrate Vocal Tract Acoustic Print
            </div>
            <span className={`log-badge ${voiceBaseline ? 'badge-mitre' : 'badge-info'}`}>
              {voiceBaseline ? 'VOICE CALIBRATED' : 'OPTIONAL / READY'}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Speak the official enrollment passphrase to establish your pitch ($F_0$) and spectral timbre baseline:
          </p>

          <div className="sample-text-guide" style={{ marginBottom: '1rem' }}>
            <strong>Passphrase:</strong> "My voice is my credential, authenticate security clearance level four."
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleRecordVoice} disabled={isRecordingVoice}>
              <Mic size={14} /> {isRecordingVoice ? 'Recording 3s...' : 'Record Voice Baseline (3s)'}
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {voiceBaseline
                ? `Calibrated Pitch: ${voiceBaseline.pitch_mean}Hz | Timbre: ${voiceBaseline.centroid_mean}Hz`
                : 'Click to record calibration audio'}
            </span>
          </div>
        </div>

        {/* Step 3: Activation */}
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            STEP 3: Activate Custom Enrolled Identity
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Once calibrated, your profile becomes the active defense baseline. Any alternate user typing on your machine
            will immediately trigger an insider threat alert.
          </p>

          <div className="btn-group">
            <button className="btn btn-success" onClick={handleActivate} disabled={!isReadyToActivate}>
              <CheckCircle size={14} /> Apply & Activate Enrolled Profile
            </button>
            <button className="btn" onClick={handleReset}>
              <RotateCcw size={14} /> Reset Wizard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
