"""
AEGIS - Multi-Modal Behavioral Biometrics & Insider Threat Detection Backend
Built with FastAPI & Uvicorn.
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from datetime import datetime

from .models import (
    TelemetryEvaluationRequest,
    ThreatAssessmentResponse,
    ProfileEnrollmentRequest,
    AuditEvent
)
from .database import (
    get_profile,
    list_profiles,
    save_profile,
    calibrate_profile,
    add_audit_event,
    AUDIT_LOGS,
    clear_audit_logs
)
from .engines.keystroke_engine import PythonKeystrokeEngine
from .engines.ml_keystroke_engine import MLKeystrokeEngine
from .engines.voice_engine import PythonVoiceEngine
from .engines.threat_engine import PythonThreatEngine
from .engines.langgraph_threat_agent import zero_trust_agent

app = FastAPI(
    title="AEGIS Insider Threat Detection Engine",
    description="Multi-Modal Behavioral Biometrics API (Keystroke Dynamics, Voice Acoustics, Zero-Trust Continuous Verification)",
    version="1.0.0"
)

# Enable CORS for React frontend (Vite port 5173, 3000, and wildcard localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "system": "Aegis Biometric Threat Detection Engine (FastAPI)",
        "version": "1.0.0",
        "engine": "FastAPI + Uvicorn + NumPy"
    }

@app.get("/api/profiles", response_model=List[Dict[str, Any]])
def get_all_profiles():
    return list_profiles()

@app.get("/api/profiles/{profile_id}")
def get_profile_details(profile_id: str):
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "id": profile["id"],
        "name": profile["name"],
        "role": profile["role"],
        "department": profile["department"],
        "clearance": profile["clearance"],
        "keystroke_baseline": profile["keystroke_baseline"].model_dump(),
        "voice_baseline": profile["voice_baseline"].model_dump() if profile.get("voice_baseline") else None
    }

@app.post("/api/profiles/enroll")
def enroll_profile(request: ProfileEnrollmentRequest):
    save_profile(request.model_dump())
    return {
        "success": True,
        "message": f"Biometric profile for '{request.name}' successfully enrolled and activated.",
        "profile_id": request.id
    }

@app.post("/api/profiles/calibrate")
def auto_calibrate_profile(payload: TelemetryEvaluationRequest):
    if not payload.keystrokes and not payload.voice:
        raise HTTPException(status_code=400, detail="Keystroke or voice features required for calibration")
    updated = calibrate_profile(payload.profile_id, payload.keystrokes, payload.voice)
    calibrated_types = []
    if payload.keystrokes:
        calibrated_types.append("typing dynamics")
    if payload.voice:
        calibrated_types.append("voice acoustics")
    msg = f"Biometric baseline successfully calibrated for {' & '.join(calibrated_types)}!"
    return {
        "success": True,
        "message": msg,
        "profile": {
            "id": updated["id"],
            "name": updated["name"],
            "keystroke_baseline": updated["keystroke_baseline"].model_dump(),
            "voice_baseline": updated["voice_baseline"].model_dump() if updated.get("voice_baseline") else None
        }
    }

@app.post("/api/evaluate", response_model=ThreatAssessmentResponse)
def evaluate_telemetry(payload: TelemetryEvaluationRequest):
    profile = get_profile(payload.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Target baseline profile '{payload.profile_id}' not found")

    base_k = profile["keystroke_baseline"]
    base_v = profile.get("voice_baseline")

    ksd_score = None
    ksd_details = {}
    if payload.keystrokes and payload.keystrokes.key_count >= 3:
        try:
            ksd_score, ksd_details = MLKeystrokeEngine.evaluate(payload.keystrokes, base_k)
        except Exception as e:
            ksd_score, ksd_details = PythonKeystrokeEngine.evaluate(payload.keystrokes, base_k)
            ksd_details["fallback_reason"] = str(e)

    voice_score = None
    voice_details = {}
    if payload.voice and base_v:
        voice_score, voice_details = PythonVoiceEngine.evaluate(payload.voice, base_v)

    mouse_score = payload.mouse_context.anomaly_score if payload.mouse_context else 0.05

    assessment = PythonThreatEngine.fuse(
        ksd_score=ksd_score,
        voice_score=voice_score,
        mouse_score=mouse_score,
        ksd_details=ksd_details,
        voice_details=voice_details
    )

    # Log to SIEM Audit Log
    mitre_str = assessment.mitre_tags[0].id if assessment.mitre_tags else "NORMAL"
    dwell_str = f"{payload.keystrokes.dwell_mean}ms" if payload.keystrokes else "N/A"
    voice_str = f"{round((voice_score or 0) * 100)}%" if voice_score is not None else "N/A"

    action = "SESSION_PERMITTED"
    if assessment.level == "CRITICAL_THREAT":
        action = "QUARANTINE_TRIGGERED"
    elif assessment.level == "SUSPICIOUS_ANOMALY":
        action = "MFA_CHALLENGE"

    add_audit_event(
        profile_id=payload.profile_id,
        level=assessment.level,
        risk_score=assessment.risk_score,
        dwell_delta=dwell_str,
        voice_delta=voice_str,
        mitre=mitre_str,
        action=action
    )

    return assessment

@app.post("/api/evaluate/graph")
def evaluate_telemetry_graph(payload: TelemetryEvaluationRequest):
    """
    Executes telemetry evaluation through the LangGraph StateGraph agent.
    Returns state graph decision, threat synthesis, and node execution trail.
    """
    profile = get_profile(payload.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Target baseline profile '{payload.profile_id}' not found")

    initial_state = {
        "session_id": f"sess_{payload.profile_id}_{int(datetime.utcnow().timestamp())}",
        "profile_id": payload.profile_id,
        "user_name": profile["name"],
        "keystrokes": payload.keystrokes.model_dump() if payload.keystrokes else None,
        "voice": payload.voice.model_dump() if payload.voice else None,
        "mouse_anomaly": payload.mouse_context.anomaly_score if payload.mouse_context else 0.05,
        "base_keystrokes": profile["keystroke_baseline"].model_dump(),
        "base_voice": profile["voice_baseline"].model_dump() if profile.get("voice_baseline") else None,
        "is_synthetic_bot": False,
        "keystroke_score": None,
        "keystroke_details": {},
        "voice_score": None,
        "voice_details": {},
        "fused_risk_score": 0,
        "threat_level": "TRUSTED",
        "recommendation": "",
        "mitre_tags": [],
        "enforcement_action": "ALLOW",
        "execution_trail": []
    }

    result = zero_trust_agent.invoke(initial_state)
    return result

@app.get("/api/logs", response_model=List[AuditEvent])
def get_audit_logs():
    return AUDIT_LOGS

@app.delete("/api/logs")
def clear_logs():
    clear_audit_logs()
    return {"success": True, "message": "Audit logs cleared."}

@app.post("/api/quarantine")
def quarantine_session(payload: Dict[str, Any]):
    profile_id = payload.get("profile_id", "unknown")
    event = add_audit_event(
        profile_id=profile_id,
        level="CRITICAL_THREAT",
        risk_score=100,
        dwell_delta="OVERRIDE",
        voice_delta="OVERRIDE",
        mitre="T1078.003",
        action="MANUAL_SOC_QUARANTINE"
    )
    return {"success": True, "status": "QUARANTINED", "event": event}

@app.post("/api/step-up")
def trigger_step_up(payload: Dict[str, Any]):
    profile_id = payload.get("profile_id", "unknown")
    event = add_audit_event(
        profile_id=profile_id,
        level="SUSPICIOUS_ANOMALY",
        risk_score=65,
        dwell_delta="DRIFT",
        voice_delta="PENDING_CHALLENGE",
        mitre="T1078",
        action="STEP_UP_CHALLENGE_ISSUED"
    )
    return {"success": True, "status": "CHALLENGE_ISSUED", "event": event}

import os
from fastapi.staticfiles import StaticFiles

# Serve compiled React frontend if present
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static_frontend")
