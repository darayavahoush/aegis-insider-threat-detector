import uuid
from typing import Dict, List, Optional
from .models import (
    KeystrokeFeatureVector,
    VoiceFeatureVector,
    DigraphDetail,
    AuditEvent
)

# Baseline Enrolled Identities
PROFILES: Dict[str, dict] = {
    "sarah_vance": {
        "id": "sarah_vance",
        "name": "Sarah Vance",
        "role": "Lead Cloud Security Analyst",
        "department": "Threat Operations",
        "clearance": "Level-4 (Restricted Systems)",
        "keystroke_baseline": KeystrokeFeatureVector(
            key_count=120,
            dwell_mean=95.0,
            dwell_std=18.0,
            flight_mean=120.0,
            flight_std=30.0,
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
            pitch_std=20.0,
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
            dwell_std=24.0,
            flight_mean=165.0,
            flight_std=42.0,
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
            pitch_std=14.0,
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
    return PROFILES.get(profile_id) or PROFILES.get("sarah_vance")

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
