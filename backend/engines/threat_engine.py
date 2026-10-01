from datetime import datetime
from typing import Optional, List, Dict, Any
from ..models import (
    ThreatAssessmentResponse,
    BreakdownScores,
    MitreTag
)

class PythonThreatEngine:
    """
    Synthesizes multi-factor behavioral vectors into a continuous threat risk index.
    Classifies risk level, generates recommendations, and maps anomalies to the MITRE ATT&CK matrix.
    """

    WEIGHTS = {
        "keystroke": 0.55,
        "voice": 0.35,
        "mouse_context": 0.10
    }

    @classmethod
    def fuse(
        cls,
        ksd_score: Optional[float],
        voice_score: Optional[float],
        mouse_score: Optional[float],
        ksd_details: Dict[str, Any],
        voice_details: Dict[str, Any]
    ) -> ThreatAssessmentResponse:
        weighted_sum = 0.0
        total_weight = 0.0

        if ksd_score is not None:
            w = cls.WEIGHTS["keystroke"]
            weighted_sum += ksd_score * w
            total_weight += w

        if voice_score is not None:
            w = cls.WEIGHTS["voice"]
            weighted_sum += voice_score * w
            total_weight += w

        m_score = mouse_score if mouse_score is not None else 0.05
        w_m = cls.WEIGHTS["mouse_context"]
        weighted_sum += m_score * w_m
        total_weight += w_m

        fused_anomaly = (weighted_sum / total_weight) if total_weight > 0 else 0.0
        risk_score = int(round(fused_anomaly * 100))

        # Risk Classification
        if risk_score >= 75:
            level = "CRITICAL_THREAT"
            status_class = "status-critical"
            recommendation = "QUARANTINE SESSION IMMEDIATELY: Probable stolen credential or physical console hijacking."
        elif risk_score >= 50:
            level = "SUSPICIOUS_ANOMALY"
            status_class = "status-drift"
            recommendation = "TRIGGER STEP-UP CHALLENGE: Voice biometric or Hardware MFA token verification required."
        elif risk_score >= 26:
            level = "ELEVATED_DRIFT"
            status_class = "status-drift"
            recommendation = "MONITOR: Behavioral cadence drift detected (potential fatigue or posture change)."
        else:
            level = "TRUSTED"
            status_class = "status-trusted"
            recommendation = "Allow uninterrupted continuous execution. Behavioral identity verified."

        # MITRE ATT&CK Mapping
        mitre_tags: List[MitreTag] = []
        if ksd_details.get("is_synthetic_bot"):
            mitre_tags.append(MitreTag(
                id="T1056.001",
                name="Keylogging / Synthetic Keystroke Injection",
                description="Near-zero jitter timing indicates automated keystroke injection script or BadUSB replay attack."
            ))

        if risk_score >= 70:
            mitre_tags.append(MitreTag(
                id="T1078.003",
                name="Valid Accounts: Local Accounts Hijacking",
                description="Authorized credential operated by an unregistered physical individual with mismatched motor rhythm."
            ))

        if voice_score is not None and voice_score > 0.65:
            mitre_tags.append(MitreTag(
                id="T1056",
                name="Spoofed Audio / Speaker Discrepancy",
                description="Vocal tract resonance and fundamental frequency mismatch against authorized baseline."
            ))

        breakdown = BreakdownScores(
            keystroke_anomaly=int(round((ksd_score or 0.0) * 100)),
            voice_anomaly=int(round(voice_score * 100)) if voice_score is not None else None,
            mouse_anomaly=int(round(m_score * 100))
        )

        return ThreatAssessmentResponse(
            timestamp=datetime.utcnow().isoformat() + "Z",
            risk_score=risk_score,
            fused_anomaly=round(fused_anomaly, 3),
            level=level,
            status_class=status_class,
            recommendation=recommendation,
            mitre_tags=mitre_tags,
            breakdown=breakdown,
            details={
                "keystroke": ksd_details,
                "voice": voice_details
            }
        )
