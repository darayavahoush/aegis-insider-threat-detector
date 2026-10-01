/**
 * AEGIS - Main Controller & Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
  // Instantiate Core Engines
  const storage = new StorageManager();
  const keystrokeEngine = new KeystrokeEngine();
  const voiceEngine = new VoiceEngine();
  const threatEngine = new ThreatEngine();
  const visualizer = new Visualizer();

  // Application State
  let currentProfileId = storage.getSelectedProfileId();
  let currentProfile = getProfileById(currentProfileId);
  let activeVoiceResult = null;
  let keystrokeDebounceTimer = null;
  let visualizerAnimFrame = null;

  // Enrollment State
  let enrollmentSamples = [];
  let enrollmentVoiceBaseline = null;

  // DOM Elements - Navigation
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // DOM Elements - Header
  const profileSelector = document.getElementById('profile-selector');
  const headerStatusPill = document.getElementById('header-status-pill');
  const headerStatusText = document.getElementById('header-status-text');
  const headerKeyCount = document.getElementById('header-key-count');

  // DOM Elements - Terminal Workspace
  const terminalInput = document.getElementById('terminal-input');
  const btnAnalyzeNow = document.getElementById('btn-analyze-now');
  const btnClearTerminal = document.getElementById('btn-clear-terminal');
  const promptSuggestion = document.getElementById('prompt-suggestion');
  const currentKeyCount = document.getElementById('current-key-count');
  const keystrokeCanvas = document.getElementById('keystroke-canvas');
  const riskTimelineCanvas = document.getElementById('risk-timeline-canvas');

  // DOM Elements - Threat Assessment Gauge
  const gaugeScore = document.getElementById('gauge-score');
  const threatBadge = document.getElementById('threat-badge');
  const meterFill = document.getElementById('meter-fill');
  const lastEvalTime = document.getElementById('last-eval-time');
  const socRecommendation = document.getElementById('soc-recommendation');
  const ksdDeltaVal = document.getElementById('ksd-delta-val');
  const valDwellMean = document.getElementById('val-dwell-mean');
  const valFlightMean = document.getElementById('val-flight-mean');
  const valRhythmCV = document.getElementById('val-rhythm-cv');
  const valWpm = document.getElementById('val-wpm');
  const valBackspace = document.getElementById('val-backspace');
  const digraphContainer = document.getElementById('digraph-container');
  const btnQuarantine = document.getElementById('btn-quarantine-session');
  const btnStepUpMfa = document.getElementById('btn-stepup-mfa');

  // DOM Elements - Voice Biometrics
  const micRecordBtn = document.getElementById('mic-record-btn');
  const micStatusLabel = document.getElementById('mic-status-label');
  const voiceSourceTag = document.getElementById('voice-source-tag');
  const voiceWaveformCanvas = document.getElementById('voice-waveform-canvas');
  const voiceSpectrumCanvas = document.getElementById('voice-spectrum-canvas');
  const valPitch = document.getElementById('val-pitch');
  const valBaselinePitch = document.getElementById('val-baseline-pitch');
  const valCentroid = document.getElementById('val-centroid');
  const valBaselineCentroid = document.getElementById('val-baseline-centroid');
  const valRms = document.getElementById('val-rms');
  const valZcr = document.getElementById('val-zcr');
  const voiceAnomalyBadge = document.getElementById('voice-anomaly-badge');
  const voiceAnomalyFill = document.getElementById('voice-anomaly-fill');
  const voiceFeedbackText = document.getElementById('voice-feedback-text');
  const btnSimVoiceMatch = document.getElementById('btn-sim-voice-match');
  const btnSimVoiceSpoof = document.getElementById('btn-sim-voice-spoof');

  // DOM Elements - Enrollment
  const enrollSampleCounter = document.getElementById('enroll-sample-counter');
  const enrollInputBox = document.getElementById('enroll-input-box');
  const enrollKeystrokeStatus = document.getElementById('enroll-keystroke-status');
  const btnSaveKeystrokeSample = document.getElementById('btn-save-keystroke-sample');
  const btnEnrollRecordVoice = document.getElementById('btn-enroll-record-voice');
  const enrollVoiceStatus = document.getElementById('enroll-voice-status');
  const enrollVoiceFeedback = document.getElementById('enroll-voice-feedback');
  const btnActivateCustomProfile = document.getElementById('btn-activate-custom-profile');
  const btnResetEnrollment = document.getElementById('btn-reset-enrollment');

  // DOM Elements - SOC Log
  const socLogTbody = document.getElementById('soc-log-tbody');
  const btnExportAudit = document.getElementById('btn-export-audit');
  const btnClearSocLogs = document.getElementById('btn-clear-soc-logs');

  // -------------------------------------------------------------
  // 1. Initial Setup & Helpers
  // -------------------------------------------------------------
  function getProfileById(id) {
    if (id === 'custom_profile') {
      const custom = storage.getCustomProfile();
      if (custom) return custom;
    }
    return PRESET_PROFILES[id] || PRESET_PROFILES.sarah_vance;
  }

  function updateActiveProfile(id) {
    currentProfileId = id;
    storage.setSelectedProfileId(id);
    currentProfile = getProfileById(id);

    // Update UI baselines
    if (currentProfile && currentProfile.voiceBaseline) {
      valBaselinePitch.textContent = `${currentProfile.voiceBaseline.pitchMean} Hz (±${currentProfile.voiceBaseline.pitchStd || 20} Hz)`;
      valBaselineCentroid.textContent = `${currentProfile.voiceBaseline.centroidMean} Hz`;
    }

    renderDigraphBaselines();
    showToast(`Active biometric baseline profile set to: ${currentProfile.name}`, 'info');
    evaluateTelemetry();
  }

  // Initialize selector
  profileSelector.value = currentProfileId;
  updateActiveProfile(currentProfileId);

  profileSelector.addEventListener('change', (e) => {
    updateActiveProfile(e.target.value);
  });

  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // -------------------------------------------------------------
  // 2. Real-Time Canvas Animation Loop
  // -------------------------------------------------------------
  function mainRenderLoop() {
    visualizer.drawKeystrokeStream(keystrokeCanvas);
    visualizerAnimFrame = requestAnimationFrame(mainRenderLoop);
  }
  mainRenderLoop();

  // -------------------------------------------------------------
  // 3. Keystroke Dynamics Event Handlers
  // -------------------------------------------------------------
  terminalInput.addEventListener('keydown', (e) => {
    keystrokeEngine.handleKeyDown(e);
    const features = keystrokeEngine.getFeatures();
    const count = features ? features.keyCount : 0;
    headerKeyCount.textContent = count;
    currentKeyCount.textContent = count;
  });

  terminalInput.addEventListener('keyup', (e) => {
    keystrokeEngine.handleKeyUp(e);

    // Get the latest dwell time for pulse animation
    const dwell = (keystrokeEngine.dwellTimes.length > 0)
      ? keystrokeEngine.dwellTimes[keystrokeEngine.dwellTimes.length - 1]
      : 90;
    visualizer.addKeystrokePulse(e.key, dwell);

    // Debounce threat evaluation so it triggers naturally while typing
    clearTimeout(keystrokeDebounceTimer);
    keystrokeDebounceTimer = setTimeout(() => {
      evaluateTelemetry();
    }, 450);
  });

  btnAnalyzeNow.addEventListener('click', () => {
    evaluateTelemetry();
    showToast('Manual anomaly evaluation computed.', 'info');
  });

  btnClearTerminal.addEventListener('click', () => {
    terminalInput.value = '';
    keystrokeEngine.reset();
    activeVoiceResult = null;
    headerKeyCount.textContent = '0';
    currentKeyCount.textContent = '0';
    updateRiskUI({
      riskScore: 0,
      level: 'TRUSTED',
      statusClass: 'status-trusted',
      recommendation: 'Input reset. Ready for typing.',
      breakdown: { keystrokeAnomaly: 0, voiceAnomaly: null }
    });
    visualizer.drawRiskTimeline(riskTimelineCanvas, 0);
    showToast('Terminal and behavioral buffers cleared.', 'info');
  });

  if (promptSuggestion) {
    promptSuggestion.addEventListener('click', () => {
      terminalInput.value = promptSuggestion.textContent.trim();
      terminalInput.focus();
      showToast('Prompt populated. You can retype or edit to generate live dynamics.', 'info');
    });
  }

  // -------------------------------------------------------------
  // 4. Multi-Modal Threat Assessment Engine
  // -------------------------------------------------------------
  function evaluateTelemetry(simulatedFeatures = null) {
    const features = simulatedFeatures || keystrokeEngine.getFeatures();
    lastEvalTime.textContent = `LAST EVAL: ${new Date().toLocaleTimeString()}`;

    if (!features || features.keyCount < 3) {
      valDwellMean.textContent = '-- ms';
      valFlightMean.textContent = '-- ms';
      valRhythmCV.textContent = '--';
      valWpm.textContent = '-- WPM';
      valBackspace.textContent = '-- %';
      return;
    }

    // Update real-time metric numbers
    valDwellMean.textContent = `${features.dwellMean} ms`;
    valFlightMean.textContent = `${features.flightMean} ms`;
    valRhythmCV.textContent = `${features.rhythmCV}`;
    valWpm.textContent = `${features.wpm} WPM`;
    valBackspace.textContent = `${Math.round(features.backspaceRate * 100)} %`;

    // 1. Compute Keystroke Anomaly against baseline
    const ksdResult = keystrokeEngine.computeAnomaly(features, currentProfile.keystrokeBaseline);
    ksdDeltaVal.textContent = `${ksdResult.details.compositeZ || 0}σ (${Math.round(ksdResult.anomalyScore * 100)}% Anomaly)`;

    // 2. Evaluate with ThreatEngine
    const assessment = threatEngine.evaluate({
      keystrokeResult: ksdResult,
      voiceResult: activeVoiceResult,
      mouseContextResult: { anomalyScore: 0.05 }
    });

    // 3. Update Visual UI
    updateRiskUI(assessment);

    // 4. Update timeline chart
    visualizer.drawRiskTimeline(riskTimelineCanvas, assessment.riskScore);

    // 5. Update Digraph Visuals
    updateDigraphVisuals(features.digraphStats);

    // 6. Log to SOC if significant or evaluated
    logSocIncident(assessment, features);
  }

  function updateRiskUI(assessment) {
    const score = assessment.riskScore;
    gaugeScore.textContent = `${score}%`;
    meterFill.style.width = `${score}%`;

    // Colors
    let color = 'var(--accent-emerald)';
    if (score >= 50) color = 'var(--accent-warning)';
    if (score >= 75) color = 'var(--accent-danger)';
    gaugeScore.style.color = color;

    // Status label
    threatBadge.className = `threat-status-label ${assessment.statusClass}`;
    if (assessment.level === 'CRITICAL_THREAT') {
      threatBadge.textContent = 'CRITICAL // INSIDER THREAT DETECTED';
      headerStatusPill.className = 'telemetry-pill status-danger';
      headerStatusText.textContent = `ALERT: THREAT DETECTED (${score}% RISK)`;
    } else if (assessment.level === 'SUSPICIOUS_ANOMALY') {
      threatBadge.textContent = 'SUSPICIOUS // STEP-UP REQUIRED';
      headerStatusPill.className = 'telemetry-pill status-danger';
      headerStatusText.textContent = `SUSPICIOUS CADENCE (${score}% RISK)`;
    } else if (assessment.level === 'ELEVATED_DRIFT') {
      threatBadge.textContent = 'ELEVATED // BEHAVIORAL DRIFT';
      headerStatusPill.className = 'telemetry-pill status-safe';
      headerStatusText.textContent = `DRIFT DETECTED (${score}% RISK)`;
    } else {
      threatBadge.textContent = 'TRUSTED // AUTHENTICATED';
      headerStatusPill.className = 'telemetry-pill status-safe';
      headerStatusText.textContent = `STATUS: AUTHENTICATED (${score}% RISK)`;
    }

    socRecommendation.textContent = assessment.recommendation;
  }

  function renderDigraphBaselines() {
    digraphContainer.innerHTML = '';
    const stats = currentProfile.keystrokeBaseline.digraphStats || {};
    const keys = Object.keys(stats).slice(0, 8);

    keys.forEach(dg => {
      const baseMean = stats[dg].mean;
      const div = document.createElement('div');
      div.className = 'digraph-item';
      div.id = `dg-item-${dg}`;
      div.innerHTML = `
        <div class="digraph-name">
          <span>'${dg}'</span>
          <span id="dg-val-${dg}">${baseMean}ms</span>
        </div>
        <div class="digraph-bar">
          <div class="digraph-bar-fill" id="dg-bar-${dg}" style="width: ${Math.min(baseMean / 3, 100)}%;"></div>
        </div>
      `;
      digraphContainer.appendChild(div);
    });
  }

  function updateDigraphVisuals(testDigraphs) {
    if (!testDigraphs) return;
    for (const dg in testDigraphs) {
      const valElem = document.getElementById(`dg-val-${dg}`);
      const barElem = document.getElementById(`dg-bar-${dg}`);
      if (valElem && barElem) {
        const mean = testDigraphs[dg].mean;
        valElem.textContent = `${mean}ms`;
        barElem.style.width = `${Math.min(mean / 3, 100)}%`;

        // Check delta vs baseline
        const baseMean = currentProfile.keystrokeBaseline.digraphStats?.[dg]?.mean || 120;
        if (Math.abs(mean - baseMean) > 70) {
          barElem.style.background = 'var(--accent-danger)';
        } else {
          barElem.style.background = 'var(--accent-blue)';
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 5. Voice Biometrics Engine Handlers
  // -------------------------------------------------------------
  micRecordBtn.addEventListener('click', async () => {
    if (!voiceEngine.isRecording) {
      // Start recording
      micRecordBtn.classList.add('recording');
      micStatusLabel.textContent = 'Listening... Speak passphrase now!';
      voiceAnomalyBadge.className = 'log-badge badge-info';
      voiceAnomalyBadge.textContent = 'SAMPLING LIVE';

      const res = await voiceEngine.startListening((frameData) => {
        // Draw real-time canvas visualizations
        visualizer.drawWaveform(voiceWaveformCanvas, frameData.timeData);
        visualizer.drawSpectrum(voiceSpectrumCanvas, frameData.freqData);

        // Update live stats
        if (frameData.isVoiced) {
          valPitch.textContent = `${Math.round(frameData.pitch)} Hz`;
          valCentroid.textContent = `${Math.round(frameData.spectralCentroid)} Hz`;
          valRms.textContent = frameData.rms.toFixed(3);
          valZcr.textContent = frameData.zcr.toFixed(3);
        }
      });

      voiceSourceTag.textContent = res.mode === 'live_mic' ? 'LIVE MICROPHONE' : 'SYNTHETIC DSP SIMULATOR';
    } else {
      // Stop recording
      micRecordBtn.classList.remove('recording');
      micStatusLabel.textContent = 'Processing Voice Biometric Print...';

      const acousticProfile = voiceEngine.stopListening();
      micStatusLabel.textContent = 'Click to Start Audio Capture';

      // Compare against baseline
      const vResult = voiceEngine.computeAnomaly(acousticProfile, currentProfile.voiceBaseline);
      activeVoiceResult = {
        active: true,
        anomalyScore: vResult.anomalyScore,
        profile: acousticProfile
      };

      const percent = Math.round(vResult.anomalyScore * 100);
      voiceAnomalyFill.style.width = `${percent}%`;

      if (percent < 30) {
        voiceAnomalyBadge.className = 'log-badge badge-info';
        voiceAnomalyBadge.textContent = `AUTHENTICATED (${percent}%)`;
        voiceAnomalyFill.style.background = 'var(--accent-emerald)';
        voiceFeedbackText.textContent = `Acoustic match confirmed: Pitch Δ=${vResult.details.pitchDelta}Hz within verified standard deviation.`;
      } else {
        voiceAnomalyBadge.className = 'log-badge badge-danger';
        voiceAnomalyBadge.textContent = `SPOOF ALERT (${percent}%)`;
        voiceAnomalyFill.style.background = 'var(--accent-danger)';
        voiceFeedbackText.textContent = `Vocal tract discrepancy: Pitch Δ=${vResult.details.pitchDelta}Hz, Centroid Δ=${vResult.details.centroidDelta}Hz. Potential speaker mismatch.`;
      }

      evaluateTelemetry();
    }
  });

  // Simulated Voice Tests
  btnSimVoiceMatch.addEventListener('click', () => {
    activeVoiceResult = {
      active: true,
      anomalyScore: 0.12,
      profile: { pitchMean: currentProfile.voiceBaseline.pitchMean - 3, centroidMean: currentProfile.voiceBaseline.centroidMean }
    };
    valPitch.textContent = `${currentProfile.voiceBaseline.pitchMean - 3} Hz`;
    valCentroid.textContent = `${currentProfile.voiceBaseline.centroidMean} Hz`;
    valRms.textContent = '0.215';
    valZcr.textContent = '0.081';
    voiceAnomalyBadge.className = 'log-badge badge-info';
    voiceAnomalyBadge.textContent = 'AUTHENTICATED (12%)';
    voiceAnomalyFill.style.width = '12%';
    voiceAnomalyFill.style.background = 'var(--accent-emerald)';
    voiceFeedbackText.textContent = 'Simulated legitimate voice sample verified against authorized acoustic profile.';
    showToast('Legitimate voice verification simulated.', 'success');
    evaluateTelemetry();
  });

  btnSimVoiceSpoof.addEventListener('click', () => {
    activeVoiceResult = {
      active: true,
      anomalyScore: 0.88,
      profile: { pitchMean: 95, centroidMean: 1100 }
    };
    valPitch.textContent = '95 Hz (Mismatch)';
    valCentroid.textContent = '1100 Hz';
    valRms.textContent = '0.120';
    valZcr.textContent = '0.045';
    voiceAnomalyBadge.className = 'log-badge badge-danger';
    voiceAnomalyBadge.textContent = 'VOICE SPOOF (88%)';
    voiceAnomalyFill.style.width = '88%';
    voiceAnomalyFill.style.background = 'var(--accent-danger)';
    voiceFeedbackText.textContent = 'Critical voice anomaly: 100Hz pitch deviation from authorized baseline. Potential impersonator.';
    showToast('Voice spoof / deepfake scenario injected!', 'error');
    evaluateTelemetry();
  });

  // -------------------------------------------------------------
  // 6. Adversary Sandbox (Attack Scenarios)
  // -------------------------------------------------------------
  document.querySelectorAll('.btn-inject-scenario').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scenarioKey = btn.getAttribute('data-scenario');
      const scenario = ATTACK_SCENARIOS[scenarioKey];
      if (!scenario) return;

      terminalInput.value = `[SIMULATED WORKSPACE TELEMETRY INJECTED - ${scenario.title.toUpperCase()}]\nExecuting administrative query...`;

      // Inject simulated voice
      if (scenario.voiceSim) {
        const vResult = voiceEngine.computeAnomaly(scenario.voiceSim, currentProfile.voiceBaseline);
        activeVoiceResult = {
          active: true,
          anomalyScore: vResult.anomalyScore,
          profile: scenario.voiceSim
        };
      } else {
        activeVoiceResult = null;
      }

      evaluateTelemetry(scenario.keystrokeSim);
      showToast(`Adversary Scenario Injected: ${scenario.title}`, 'warn');

      // Switch to continuous workspace tab to view results
      document.querySelector('[data-tab="tab-terminal"]').click();
    });
  });

  // -------------------------------------------------------------
  // 7. Biometric Enrollment Wizard Handlers
  // -------------------------------------------------------------
  const enrollKeystrokeEngine = new KeystrokeEngine();

  enrollInputBox.addEventListener('keydown', (e) => {
    enrollKeystrokeEngine.handleKeyDown(e);
    enrollKeystrokeStatus.textContent = `Typing: ${enrollInputBox.value.length} characters captured`;
  });

  enrollInputBox.addEventListener('keyup', (e) => {
    enrollKeystrokeEngine.handleKeyUp(e);
  });

  btnSaveKeystrokeSample.addEventListener('click', () => {
    const features = enrollKeystrokeEngine.getFeatures();
    if (!features || features.keyCount < 15) {
      showToast('Please type the full calibration passage before saving.', 'warn');
      return;
    }

    enrollmentSamples.push(features);
    enrollKeystrokeEngine.reset();
    enrollInputBox.value = '';

    const count = enrollmentSamples.length;
    if (count < 3) {
      enrollSampleCounter.textContent = `Sample ${count + 1} of 3`;
      showToast(`Sample ${count} recorded. Please type it again for sample ${count + 1}.`, 'info');
    } else {
      enrollSampleCounter.className = 'log-badge badge-mitre';
      enrollSampleCounter.textContent = 'KEYSTROKES CALIBRATED (3/3)';
      btnSaveKeystrokeSample.disabled = true;
      checkEnrollmentComplete();
      showToast('Keystroke calibration complete! Proceed to Step 2 for voice enrollment.', 'success');
    }
  });

  btnEnrollRecordVoice.addEventListener('click', async () => {
    btnEnrollRecordVoice.disabled = true;
    enrollVoiceStatus.className = 'log-badge badge-warn';
    enrollVoiceStatus.textContent = 'RECORDING 3s...';
    enrollVoiceFeedback.textContent = 'Speaking passphrase now...';

    await voiceEngine.startListening();

    setTimeout(() => {
      const acousticProfile = voiceEngine.stopListening();
      enrollmentVoiceBaseline = acousticProfile;
      enrollVoiceStatus.className = 'log-badge badge-mitre';
      enrollVoiceStatus.textContent = 'VOICE CALIBRATED';
      enrollVoiceFeedback.textContent = `Calibrated Pitch: ${acousticProfile.pitchMean}Hz | Timbre: ${acousticProfile.centroidMean}Hz`;
      btnEnrollRecordVoice.disabled = false;
      checkEnrollmentComplete();
      showToast('Voice acoustic baseline successfully calibrated!', 'success');
    }, 3200);
  });

  function checkEnrollmentComplete() {
    if (enrollmentSamples.length >= 3 && enrollmentVoiceBaseline) {
      btnActivateCustomProfile.disabled = false;
      btnActivateCustomProfile.classList.add('pulse-green');
    }
  }

  btnActivateCustomProfile.addEventListener('click', () => {
    // Average the keystroke samples
    const avgDwell = enrollmentSamples.reduce((a, s) => a + s.dwellMean, 0) / enrollmentSamples.length;
    const avgFlight = enrollmentSamples.reduce((a, s) => a + s.flightMean, 0) / enrollmentSamples.length;
    const avgCV = enrollmentSamples.reduce((a, s) => a + s.rhythmCV, 0) / enrollmentSamples.length;
    const avgWpm = enrollmentSamples.reduce((a, s) => a + s.wpm, 0) / enrollmentSamples.length;

    const customProfile = {
      id: 'custom_profile',
      name: 'Custom User (You)',
      role: 'Authenticated Operator',
      department: 'Enrolled Workstation',
      clearance: 'Level-5 High Security',
      keystrokeBaseline: {
        dwellMean: Math.round(avgDwell),
        dwellStd: 18,
        flightMean: Math.round(avgFlight),
        flightStd: 30,
        rhythmCV: parseFloat(avgCV.toFixed(3)),
        wpm: Math.round(avgWpm),
        backspaceRate: 0.04,
        digraphStats: {
          'th': { mean: Math.round(avgFlight * 0.9), count: 10 },
          'he': { mean: Math.round(avgFlight * 0.85), count: 10 },
          'in': { mean: Math.round(avgFlight * 0.95), count: 10 }
        }
      },
      voiceBaseline: enrollmentVoiceBaseline
    };

    storage.saveCustomProfile(customProfile);
    profileSelector.value = 'custom_profile';
    updateActiveProfile('custom_profile');

    showToast('Your personal behavioral biometric profile is now ACTIVE!', 'success');
    document.querySelector('[data-tab="tab-terminal"]').click();
  });

  btnResetEnrollment.addEventListener('click', () => {
    enrollmentSamples = [];
    enrollmentVoiceBaseline = null;
    enrollSampleCounter.textContent = 'Sample 1 of 3';
    enrollSampleCounter.className = 'log-badge badge-info';
    btnSaveKeystrokeSample.disabled = false;
    enrollVoiceStatus.textContent = 'NOT ENROLLED';
    enrollVoiceStatus.className = 'log-badge badge-info';
    enrollVoiceFeedback.textContent = 'Click to record calibration audio';
    btnActivateCustomProfile.disabled = true;
    enrollInputBox.value = '';
    showToast('Enrollment workspace reset.', 'info');
  });

  // -------------------------------------------------------------
  // 8. SOC Incident Logging & Mitigation Actions
  // -------------------------------------------------------------
  function logSocIncident(assessment, features) {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      level: assessment.level,
      riskScore: assessment.riskScore,
      dwellDelta: `${features.dwellMean}ms`,
      voiceDelta: activeVoiceResult ? `${Math.round(activeVoiceResult.anomalyScore * 100)}%` : 'N/A',
      mitre: assessment.mitreTags.length > 0 ? assessment.mitreTags[0].id : 'N/A',
      action: assessment.level === 'CRITICAL_THREAT' ? 'QUARANTINE_TRIGGERED' : (assessment.level === 'SUSPICIOUS_ANOMALY' ? 'MFA_CHALLENGE' : 'SESSION_PERMITTED')
    };

    storage.addAuditLog(entry);
    renderSocLogs();
  }

  function renderSocLogs() {
    const logs = storage.getAuditLogs();
    socLogTbody.innerHTML = '';

    if (logs.length === 0) {
      socLogTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1rem;">No incidents logged yet. Continuous telemetry active.</td></tr>`;
      return;
    }

    logs.slice(0, 15).forEach(log => {
      let badgeClass = 'badge-info';
      if (log.riskScore >= 50) badgeClass = 'badge-warn';
      if (log.riskScore >= 75) badgeClass = 'badge-danger';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--text-muted);">${log.timestamp}</td>
        <td><span class="log-badge ${badgeClass}">${log.level}</span></td>
        <td style="font-weight:700;">${log.riskScore}%</td>
        <td>${log.dwellDelta}</td>
        <td>${log.voiceDelta}</td>
        <td><span class="log-badge badge-mitre">${log.mitre}</span></td>
        <td style="color:var(--accent-cyan); font-weight:600;">${log.action}</td>
      `;
      socLogTbody.appendChild(tr);
    });
  }
  renderSocLogs();

  btnQuarantine.addEventListener('click', () => {
    updateRiskUI({
      riskScore: 100,
      level: 'CRITICAL_THREAT',
      statusClass: 'status-critical',
      recommendation: 'MANUAL SOC OVERRIDE: Session Terminated and IP Quarantined.',
      breakdown: { keystrokeAnomaly: 100, voiceAnomaly: 100 }
    });
    showToast('🚨 WORKSTATION QUARANTINED: Active token revoked and SOC notified.', 'error');
  });

  btnStepUpMfa.addEventListener('click', () => {
    showToast('🔑 STEP-UP CHALLENGE ISSUED: Voice or Hardware FIDO2 MFA sent to authorized user.', 'warn');
  });

  btnExportAudit.addEventListener('click', () => {
    const logs = storage.getAuditLogs();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `aegis_forensic_audit_${Date.now()}.json`);
    dlAnchor.click();
    showToast('Forensic audit log exported to JSON.', 'success');
  });

  btnClearSocLogs.addEventListener('click', () => {
    storage.clearAuditLogs();
    renderSocLogs();
    showToast('SOC incident logs cleared.', 'info');
  });

  // -------------------------------------------------------------
  // 9. Toast Notification System
  // -------------------------------------------------------------
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warn') icon = '⚠️';
    if (type === 'error') icon = '🚨';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

});
