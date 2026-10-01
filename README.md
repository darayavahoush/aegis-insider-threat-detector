# 🛡️ AEGIS: React.js & FastAPI Continuous Behavioral Biometrics Platform

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61dafb.svg?logo=react&logoColor=black)](#)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_%2B_Uvicorn-009688.svg?logo=fastapi&logoColor=white)](#)
[![Biometrics](https://img.shields.io/badge/Modality-Keystroke_Dynamics_%2B_Voice_Acoustics-cyan.svg)](#)
[![MITRE](https://img.shields.io/badge/Framework-MITRE_ATT%26CK-purple.svg)](#)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

> **Continuous Zero-Trust Behavioral Authentication & Insider Threat Detection Platform**  
> Powered by **React.js** on the frontend and **FastAPI + Uvicorn** on the backend.

---

## 🎯 Architecture Overview

```
+---------------------------------------------------------------------------------------+
|                                  AEGIS ARCHITECTURE                                   |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                        REACT.JS FRONTEND (Vite / Port 5173)                   |   |
|   |                                                                               |   |
|   |   [Hardware Keystrokes]                  [Web Audio API DSP]                  |   |
|   |   - useKeystrokeCollector                - useVoiceRecorder                   |   |
|   |   - Sub-ms Keydown/Keyup                 - Live FFT Spectrogram (Canvas)      |   |
|   |   - Dwell / Flight / Digraphs            - Autocorrelation Pitch (F0) & Timbre|   |
|   +-------------------------------------------------------------------------------+   |
|                                          |                                            |
|                                          v (REST / JSON Payload)                      |
|   +-------------------------------------------------------------------------------+   |
|   |                    FASTAPI + UVICORN BACKEND (Port 8000)                      |   |
|   |                                                                               |   |
|   |   [Python Keystroke Engine]              [Python Voice Acoustic Engine]       |   |
|   |   - Multi-variate Z-scores               - F0 Pitch & Spectral Centroid Δ     |   |
|   |   - Mahalanobis Distance                 - Energy RMS & ZCR Comparison        |   |
|   |                                                                               |   |
|   |                     [Python Threat Fusion Engine]                             |   |
|   |                     Risk = w_k * A_ksd + w_v * A_voice                        |   |
|   |                                                                               |   |
|   |                     [SOC Enforcement & MITRE ATT&CK]                          |   |
|   |                     T1078.003 (Console Hijack) | T1056.001 (Injection Bot)    |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

---

## ⚡ Quickstart: Running Frontend & Backend

### 1. Start the FastAPI + Uvicorn Backend
```bash
# From project root
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
# or
npm run dev:backend
```
- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Built React App (Single-Port Mode)**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

### 2. Start the React + Vite Development Server (with HMR)
```bash
# In another terminal
npm --prefix frontend run dev
# or
npm run dev:frontend
```
- **React App (Vite Dev Server)**: [http://localhost:5173](http://localhost:5173)

---

## 🔬 Core Biometric & ML Parameters

### 1. Keystroke Dynamics Engine (`backend/engines/keystroke_engine.py`)
- **Dwell Time ($T_{dwell}$)**: Key release timestamp minus key press timestamp ($t_{keyup} - t_{keydown}$).
- **Flight Time ($T_{flight}$)**: Latency between key release and subsequent key press.
- **Digraph Matrices**: Muscle memory transition latencies for frequent character pairs (`th`, `he`, `in`, `er`, `an`, `re`, `on`).
- **Rhythm Stability ($CV$)**: Coefficient of variation ($\sigma_{flight} / \mu_{flight}$).
- **Synthetic Bot Detection**: Zero-variance jitter detector flags automated keystroke injection tools (**MITRE T1056.001**).

### 2. Voice Acoustic DSP Engine (`backend/engines/voice_engine.py`)
- **Fundamental Frequency ($F_0$ / Pitch)**: Extracted via real-time time-domain autocorrelation ($R_{xx}(\tau)$).
- **Spectral Centroid**: Frequency center of mass representing vocal timbre and formant brightness.
- **Root-Mean-Square (RMS)**: Speech projection volume dynamics.
- **Zero-Crossing Rate (ZCR)**: Frequency of waveform sign inversions.

### 3. Multi-Modal Threat Fusion Engine (`backend/engines/threat_engine.py`)
$$Risk(t) = 0.55 \cdot A_{keystroke} + 0.35 \cdot A_{voice} + 0.10 \cdot A_{mouseContext}$$

| Risk Score | Classification | SOC Action |
| :--- | :--- | :--- |
| **0% - 25%** | `TRUSTED / AUTHENTICATED` | Seamless, uninterrupted access. |
| **26% - 50%** | `ELEVATED DRIFT` | Passive monitoring (fatigue / posture drift). |
| **51% - 75%** | `SUSPICIOUS ANOMALY` | Step-up biometric challenge (Voice / Hardware MFA). |
| **76% - 100%** | `CRITICAL INSIDER THREAT` | **Automated Session Quarantine**, Token Revoked, SOC Alert. |

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── main.py                  # FastAPI app (CORS, REST routes, static mounting)
│   ├── models.py                # Pydantic schemas for keystrokes, audio, SIEM events
│   ├── database.py              # In-memory baseline store and audit log
│   ├── requirements.txt         # FastAPI, Uvicorn, NumPy, Pydantic
│   └── engines/
│       ├── keystroke_engine.py  # Python multi-variate Z-score evaluator
│       ├── voice_engine.py      # Acoustic pitch & spectral centroid evaluator
│       └── threat_engine.py     # Multi-modal fusion & MITRE ATT&CK classifier
├── frontend/
│   ├── package.json             # React 18, Vite, Lucide-React
│   ├── vite.config.js           # Vite dev config with /api proxy to FastAPI
│   ├── index.html               # React HTML shell
│   └── src/
│       ├── main.jsx             # Entry point
│       ├── App.jsx              # Main dashboard layout
│       ├── components/          # React views (Terminal, Voice, Enrollment, Sandbox, SOC, Docs)
│       ├── hooks/               # useKeystrokeCollector, useVoiceRecorder
│       ├── services/            # api.js client
│       └── styles/              # Dark SOC theme CSS
├── package.json                 # Unified workspace scripts
├── README.md                    # Documentation
└── .gitignore                   # Ignore rules
```

---

## 📄 License
Apache License 2.0. Built for enterprise defense and continuous biometric authentication research.
