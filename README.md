# 🛡️ AEGIS: Continuous Behavioral Biometrics & Insider Threat Detection Platform

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Zero-Dependency](https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg)](#)
[![Biometrics](https://img.shields.io/badge/Modality-Keystroke_Dynamics_%2B_Voice_Acoustics-cyan.svg)](#)
[![MITRE](https://img.shields.io/badge/Framework-MITRE_ATT%26CK-purple.svg)](#)

> **Continuous Zero-Trust Authentication & Behavioral Anomaly Detection against Insider Threats, Account Takeover, and Console Hijacking.**

---

## 🎯 Executive Overview & Problem Statement

In modern enterprise security, **passwords, tokens, and multi-factor authentication (MFA) only authenticate a user at the perimeter during login**. Once a session is established:
- **Physical Console Hijacking**: An authorized employee steps away from an unlocked terminal; an unauthorized colleague or intruder accesses sensitive databases.
- **Stolen Credentials & Lateral Movement**: An adversary possesses valid credentials (passwords, Kerberos tickets, API tokens) and bypasses traditional boundary firewalls (**MITRE ATT&CK T1078**).
- **Synthetic Automation / BadUSB**: Malicious scripts and BadUSB microcontrollers inject automated keystrokes with inhuman precision (**MITRE ATT&CK T1056**).
- **Coercion & Insider Duress**: An authorized employee forced to execute exfiltration under duress.

**AEGIS** solves this by enforcing **Continuous Behavioral Biometrics**. Rather than asking *"What do you know?"* or *"What do you have?"*, Aegis continuously evaluates *"How do you type and speak?"* through subconscious neuromuscular motor patterns (keystroke dynamics) and vocal tract acoustics.

---

## 🔬 Mathematical & Biometric Formulation

### 1. Keystroke Dynamics (KSD) Engine

Keystroke dynamics measures sub-millisecond temporal intervals extracted from `keydown` and `keyup` hardware events:

1. **Dwell Time ($T_{dwell}$)**: Duration a specific key $k$ is depressed:
   $$T_{dwell}(k) = t_{keyup}(k) - t_{keydown}(k)$$
2. **Flight Time ($T_{flight}$ / Release-to-Press Latency)**: Inter-key latency between releasing key $k-1$ and depressing key $k$:
   $$T_{flight}(k-1, k) = t_{keydown}(k) - t_{keyup}(k-1)$$
3. **Press-to-Press Digraph Latency ($T_{pp}$)**: Transition latency for common bigram pairs (e.g., `th`, `in`, `er`, `he`):
   $$T_{pp}(k-1, k) = t_{keydown}(k) - t_{keydown}(k-1)$$
4. **Rhythm Stability (Coefficient of Variation - $CV$)**: Ratio of standard deviation to mean of flight times:
   $$CV = \frac{\sigma_{flight}}{\mu_{flight}}$$

### 2. Multi-Variate Anomaly Distance Metric

For each feature $i \in \{ \text{dwell}, \text{flight}, \text{digraphs}, \text{rhythm} \}$, deviation from the enrolled baseline $(\mu_i, \sigma_i)$ is normalized via standardized Z-score distance:

$$Z_i = \frac{|x_i - \mu_{base, i}|}{\sigma_{base, i} + \epsilon}$$

The composite keystroke anomaly score is bounded between $0.0$ and $1.0$ using exponential sigmoidal mapping:

$$A_{ksd} = 1 - \exp\left( -\frac{1}{2} \sum_{i} w_i Z_i \right)$$

### 3. Voice Acoustic Signal Analysis (Web Audio API)

When step-up verification is needed, Aegis analyzes vocal tract resonances using the browser's native Web Audio API:
- **Fundamental Frequency ($F_0$ / Pitch)**: Extracted via time-domain autocorrelation:
  $$R_{xx}(\tau) = \sum_{n} x[n] x[n+\tau] \implies F_0 = \frac{f_s}{\tau_{max}}$$
- **Spectral Centroid (Timbre Brightness)**: Center of mass of the frequency spectrum:
  $$\text{Centroid} = \frac{\sum_{k} f_k \cdot |X[k]|}{\sum_{k} |X[k]|}$$
- **Root-Mean-Square (RMS / Energy)**: Voice volume dynamics:
  $$\text{RMS} = \sqrt{\frac{1}{N} \sum_{n=1}^{N} x[n]^2}$$
- **Zero-Crossing Rate (ZCR)**: Measure of spectral roughness and unvoiced consonantal sounds.

### 4. Multi-Modal Risk Fusion & Adaptive Thresholding

$$Risk(t) = w_{ksd} \cdot A_{ksd} + w_{voice} \cdot A_{voice} + w_{context} \cdot A_{context}$$

| Risk Score | Classification | SOC Action |
| :--- | :--- | :--- |
| **0% - 25%** | `TRUSTED / AUTHENTICATED` | Seamless, uninterrupted access. |
| **26% - 50%** | `ELEVATED DRIFT` | Passive telemetry logging (fatigue monitoring). |
| **51% - 75%** | `SUSPICIOUS ANOMALY` | Step-up biometric challenge (Voice / FIDO2 prompt). |
| **76% - 100%** | `CRITICAL INSIDER THREAT` | **Automated Session Quarantine**, Token Revoked, SOC Alert. |

---

## 🚀 Key Features in the Interactive Demo

- 🖥️ **Continuous Authentication Terminal**: Realistic simulated enterprise bastion console with sub-millisecond keystroke telemetry HUD and live dwell oscilloscope.
- 🎙️ **Voice Biometrics Console**: Live microphone recording with real-time waveform and FFT spectrogram canvas, extracting pitch ($F_0$) and spectral timbre.
- 👤 **Biometric Enrollment Studio**: Guided calibration wizard to enroll your own custom typing cadence and vocal profile in seconds.
- 🚨 **Adversary Sandbox**: Pre-configured attack injection tests:
  - *Legitimate Employee (Normal operations)*
  - *Physical Impersonator (Stolen unlocked workstation)*
  - *Synthetic Keystroke Injection (BadUSB / Python macro with 0ms jitter)*
  - *Coerced Insider Under Duress (Erratic cadence & 22% backspaces)*
  - *Voice Acoustic Spoofing / Deepfake*
- 🛡️ **SOC Incident Center**: Real-time SIEM event stream with MITRE ATT&CK correlation, one-click session quarantine, and exportable forensic JSON audit log.
- 🔒 **Privacy By Design**: Zero keylogging of sensitive passwords; only non-reversible timing intervals and acoustic moments are stored.

---

## ⚡ Quickstart & Running the Application

This project is built with **zero external dependencies** using vanilla ES2022+ web APIs, HTML5 Canvas, Web Audio API, and native Node.js / Python servers.

### Option A: Using Node.js (Recommended)
```bash
# Start the lightweight Node server (port 3000)
npm start
# or
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Option B: Using Python 3
```bash
python3 server.py
# or
npm run serve:py
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Option C: Standalone Direct Launch
Simply double-click or open `index.html` directly in any modern browser (Chrome, Firefox, Safari, Edge).

---

## 📁 Repository Structure

```
.
├── index.html              # Main application UI and SOC dashboard
├── css/
│   └── style.css           # Futuristic dark SOC design, glassmorphism, responsive grid
├── js/
│   ├── app.js              # Main coordinator and event orchestration
│   ├── keystroke-engine.js  # Millisecond event capture, dwell/flight, digraphs, Z-scores
│   ├── voice-engine.js      # Web Audio API, autocorrelation pitch detector, spectral centroid
│   ├── threat-engine.js     # Multi-modal fusion, adaptive thresholds, MITRE ATT&CK mapping
│   ├── visualizer.js        # Canvas oscilloscopes, spectrograms, and risk timeline
│   ├── presets.js           # Enrolled baselines and adversary attack personas
│   └── storage.js           # LocalStorage persistence for profiles and SOC audit logs
├── server.js               # Zero-dependency Node.js HTTP & telemetry server
├── server.py               # Zero-dependency Python 3 HTTP server
├── package.json            # Project manifest & execution scripts
├── README.md               # Architecture documentation & mathematical modeling
└── .gitignore              # Standard git exclusion rules
```

---

## 🛡️ Enterprise Security & Privacy Compliance

- **No Keylogging**: Passwords, documents, and sensitive inputs are never logged or stored. Aegis extracts temporal deltas ($\Delta t$) and discards character values.
- **GDPR & CCPA Compliant**: Biometric features are transformed into statistical distribution parameters $(\mu, \sigma)$ that cannot reconstruct raw voice recordings or textual transcripts.
- **Defense in Depth**: Integrates with Enterprise SIEMs (Splunk, Elastic, Sentinel) via standard webhook / syslog APIs.

---

## 📄 License
Apache License 2.0. Built for enterprise defense and continuous authentication research.
