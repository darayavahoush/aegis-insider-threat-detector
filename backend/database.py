import uuid
from typing import Dict, List, Optional
from .models import (
    KeystrokeFeatureVector,
    VoiceFeatureVector,
    DigraphDetail,
    AuditEvent
)

# Baseline Enrolled Identities (Default is Ananya Sridhar - Authorized User)
PROFILES: Dict[str, dict] = {
    "ananya_sridhar": {
        "id": "ananya_sridhar",
        "name": "Ananya Sridhar",
        "role": "Authorized System Owner / Analyst",
        "department": "Security Intelligence",
        "clearance": "Level-5 (Master Access)",
        "keystroke_baseline": KeystrokeFeatureVector(
            key_count=100,
            dwell_mean=105.0,
            dwell_letter_mean=96.0,
            dwell_space_mean=185.0,
            dwell_std=32.0,
            flight_mean=140.0,
            flight_motor_mean=118.0,
            flight_std=45.0,
            pause_rate=0.06,
            rhythm_cv=0.32,
            wpm=58,
            backspace_rate=0.04,
            digraph_stats={
                "th": DigraphDetail(mean=120.0, count=20),
                "he": DigraphDetail(mean=115.0, count=18),
                "in": DigraphDetail(mean=125.0, count=16),
                "er": DigraphDetail(mean=118.0, count=19),
                "an": DigraphDetail(mean=130.0, count=15),
                "re": DigraphDetail(mean=122.0, count=17),
                "on": DigraphDetail(mean=128.0, count=14)
            }
        ),
        "voice_baseline": VoiceFeatureVector(
            pitch_mean=195.0,
            pitch_std=25.0,
            centroid_mean=1720.0,
            formant_ratio=1.22,
            spectral_rolloff=2750.0,
            hnr=15.5,
            rms_mean=0.20,
            zcr_mean=0.080,
            sample_count=40
        )
    },
    "sarah_vance": {
        "id": "sarah_vance",
        "name": "Sarah Vance",
        "role": "Lead Cloud Security Analyst",
        "department": "Threat Operations",
        "clearance": "Level-4 (Restricted Systems)",
        "keystroke_baseline": KeystrokeFeatureVector(
            key_count=120,
            dwell_mean=95.0,
            dwell_std=20.0,
            flight_mean=120.0,
            flight_std=32.0,
            rhythm_cv=0.25,
            wpm=68,
            backspace_rate=0.03,
            digraph_stats={
                "th": DigraphDetail(mean=98.0, count=24),
                "he": DigraphDetail(mean=92.0, count=20),
                "in": DigraphDetail(mean=110.0, count=18),
                "er": DigraphDetail(mean=105.0, count=22),
                "an": DigraphDetail(mean=115.0, count=15),
                "re": DigraphDetail(mean=102.0, count=19),
                "on": DigraphDetail(mean=112.0, count=14)
            }
        ),
        "voice_baseline": VoiceFeatureVector(
            pitch_mean=195.0,
            pitch_std=22.0,
            centroid_mean=1740.0,
            rms_mean=0.22,
            zcr_mean=0.082,
            sample_count=45
        )
    },
    "david_chen": {
        "id": "david_chen",
        "name": "David Chen",
        "role": "Staff Database Architect",
        "department": "Core Infrastructure",
        "clearance": "Level-5 (Global Admin)",
        "keystroke_baseline": KeystrokeFeatureVector(
            key_count=150,
            dwell_mean=125.0,
            dwell_std=25.0,
            flight_mean=165.0,
            flight_std=45.0,
            rhythm_cv=0.26,
            wpm=50,
            backspace_rate=0.05,
            digraph_stats={
                "se": DigraphDetail(mean=140.0, count=30),
                "le": DigraphDetail(mean=135.0, count=25),
                "ct": DigraphDetail(mean=155.0, count=28),
                "fr": DigraphDetail(mean=148.0, count=22),
                "om": DigraphDetail(mean=138.0, count=24)
            }
        ),
        "voice_baseline": VoiceFeatureVector(
            pitch_mean=118.0,
            pitch_std=16.0,
            centroid_mean=1420.0,
            rms_mean=0.20,
            zcr_mean=0.075,
            sample_count=40
        )
    }
}

# Real-Time SOC Audit Log Buffer
AUDIT_LOGS: List[AuditEvent] = []

def get_profile(profile_id: str) -> Optional[dict]:
    return PROFILES.get(profile_id) or PROFILES.get("ananya_sridhar")

def list_profiles() -> List[dict]:
    result = []
    for pid, p in PROFILES.items():
        result.append({
            "id": p["id"],
            "name": p["name"],
            "role": p["role"],
            "department": p["department"],
            "clearance": p["clearance"],
            "has_voice": p.get("voice_baseline") is not None
        })
    return result

def save_profile(profile_data: dict) -> None:
    PROFILES[profile_data["id"]] = profile_data

def calibrate_profile(profile_id: str, keystrokes: Optional[KeystrokeFeatureVector] = None, voice: Optional[VoiceFeatureVector] = None) -> dict:
    prof = get_profile(profile_id)
    if not prof:
        prof = PROFILES["ananya_sridhar"]
    
    # Adapt baseline to the user's observed keystrokes if provided
    if keystrokes:
        dwell_letter = keystrokes.dwell_letter_mean if keystrokes.dwell_letter_mean is not None else keystrokes.dwell_mean
        dwell_space = keystrokes.dwell_space_mean if keystrokes.dwell_space_mean is not None else (keystrokes.dwell_mean * 1.65)
        flight_motor = keystrokes.flight_motor_mean if keystrokes.flight_motor_mean is not None else keystrokes.flight_mean

        prof["keystroke_baseline"] = KeystrokeFeatureVector(
            key_count=max(keystrokes.key_count, 50),
            dwell_mean=keystrokes.dwell_mean,
            dwell_letter_mean=round(dwell_letter, 1),
            dwell_space_mean=round(dwell_space, 1),
            dwell_std=max(keystrokes.dwell_std, 22.0),
            flight_mean=keystrokes.flight_mean,
            flight_motor_mean=round(flight_motor, 1),
            flight_std=max(keystrokes.flight_std, 35.0),
            pause_rate=keystrokes.pause_rate or 0.05,
            rhythm_cv=keystrokes.rhythm_cv,
            wpm=keystrokes.wpm,
            backspace_rate=keystrokes.backspace_rate,
            digraph_stats=keystrokes.digraph_stats or prof["keystroke_baseline"].digraph_stats
        )

    if voice:
        prof["voice_baseline"] = voice

    return prof

def add_audit_event(
    profile_id: str,
    level: str,
    risk_score: int,
    dwell_delta: str,
    voice_delta: str,
    mitre: str,
    action: str
) -> AuditEvent:
    from datetime import datetime
    event = AuditEvent(
        id=str(uuid.uuid4())[:8],
        timestamp=datetime.now().strftime("%H:%M:%S"),
        profile_id=profile_id,
        level=level,
        risk_score=risk_score,
        dwell_delta=dwell_delta,
        voice_delta=voice_delta,
        mitre=mitre,
        action=action
    )
    AUDIT_LOGS.insert(0, event)
    if len(AUDIT_LOGS) > 100:
        AUDIT_LOGS.pop()
    return event

def clear_audit_logs():
    AUDIT_LOGS.clear()
