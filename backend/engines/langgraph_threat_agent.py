"""
AEGIS - LangGraph Multi-Modal Zero-Trust Threat Evaluation Agent
Coordinates behavioral biometric telemetry through a stateful graph:
1. Keystroke Analyzer Node (TypeNet + One-Class SVM + Ledoit-Wolf Mahalanobis)
2. Voice Analyzer Node (Vocal tract resonance, F0, Formant ratio)
3. Threat Fusion Node (Bayesian multi-factor risk weighting + MITRE ATT&CK mapping)
4. Policy Router Node (Continuous zero-trust enforcement: ALLOW, DRIFT, STEP-UP, QUARANTINE)
"""

from datetime import datetime
from typing import Dict, Any, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END

from ..models import KeystrokeFeatureVector, VoiceFeatureVector
from .ml_keystroke_engine import MLKeystrokeEngine
from .voice_engine import PythonVoiceEngine


class ZeroTrustGraphState(TypedDict):
    session_id: str
    profile_id: str
    user_name: str
    keystrokes: Optional[Dict[str, Any]]
    voice: Optional[Dict[str, Any]]
    mouse_anomaly: float
    base_keystrokes: Dict[str, Any]
    base_voice: Optional[Dict[str, Any]]

    # Pipeline Results
    is_synthetic_bot: bool
    keystroke_score: Optional[float]
    keystroke_details: Dict[str, Any]
    voice_score: Optional[float]
    voice_details: Dict[str, Any]
    fused_risk_score: int
    threat_level: str
    recommendation: str
    mitre_tags: List[Dict[str, str]]
    enforcement_action: str
    execution_trail: List[str]


def keystroke_analyzer_node(state: ZeroTrustGraphState) -> Dict[str, Any]:
    """
    Node 1: Evaluates keystroke dynamics using TypeNet & ML anomaly detection.
    """
    trail = list(state.get("execution_trail", []))
    keystrokes_raw = state.get("keystrokes")

    if not keystrokes_raw:
        trail.append("Keystroke node: No active keyboard stream in this interval.")
        return {
            "keystroke_score": None,
            "keystroke_details": {},
            "is_synthetic_bot": False,
            "execution_trail": trail
        }

    try:
        test_k = KeystrokeFeatureVector(**keystrokes_raw)
        base_k = KeystrokeFeatureVector(**state["base_keystrokes"])

        if test_k.key_count < 3:
            trail.append(f"Keystroke node: Insufficient keys ({test_k.key_count} < 3) for reliable ML inference.")
            return {
                "keystroke_score": None,
                "keystroke_details": {"notice": "Insufficient keystrokes for ML inference"},
                "is_synthetic_bot": False,
                "execution_trail": trail
            }

        score, details = MLKeystrokeEngine.evaluate(test_k, base_k)
        is_bot = details.get("is_synthetic_bot", False)

        bot_str = " [FLAGGED SYNTHETIC INJECTION]" if is_bot else ""
        trail.append(
            f"Keystroke node: Analyzed {test_k.key_count} keys via TypeNet/OC-SVM. "
            f"Mahalanobis: {details.get('mahalanobis_distance')} | Entropy: {details.get('shannon_entropy_bits')}b | Score: {score}{bot_str}"
        )

        return {
            "keystroke_score": score,
            "keystroke_details": details,
            "is_synthetic_bot": is_bot,
            "execution_trail": trail
        }
    except Exception as e:
        trail.append(f"Keystroke node warning: {str(e)}")
        return {
            "keystroke_score": None,
            "keystroke_details": {"error": str(e)},
            "is_synthetic_bot": False,
            "execution_trail": trail
        }


def voice_analyzer_node(state: ZeroTrustGraphState) -> Dict[str, Any]:
    """
    Node 2: Evaluates voice acoustic features or neural embeddings against enrolled baseline.
    """
    trail = list(state.get("execution_trail", []))
    voice_raw = state.get("voice")
    base_v_raw = state.get("base_voice")

    if not voice_raw or not base_v_raw:
        trail.append("Voice node: No voice telemetry provided in this evaluation turn.")
        return {
            "voice_score": None,
            "voice_details": {},
            "execution_trail": trail
        }

    try:
        test_v = VoiceFeatureVector(**voice_raw)
        base_v = VoiceFeatureVector(**base_v_raw)

        score, details = PythonVoiceEngine.evaluate(test_v, base_v)
        trail.append(
            f"Voice node: Evaluated pitch F0 ({test_v.pitch_mean}Hz vs base {base_v.pitch_mean}Hz), "
            f"centroid, formant energy. Anomaly: {score}"
        )

        return {
            "voice_score": score,
            "voice_details": details,
            "execution_trail": trail
        }
    except Exception as e:
        trail.append(f"Voice node warning: {str(e)}")
        return {
            "voice_score": None,
            "voice_details": {"error": str(e)},
            "execution_trail": trail
        }


def threat_fusion_node(state: ZeroTrustGraphState) -> Dict[str, Any]:
    """
    Node 3: Synthesizes multi-factor behavioral vectors into a unified Bayesian threat risk index.
    """
    trail = list(state.get("execution_trail", []))
    ksd_score = state.get("keystroke_score")
    voice_score = state.get("voice_score")
    mouse_score = state.get("mouse_anomaly", 0.05)
    is_bot = state.get("is_synthetic_bot", False)

    weights = {"keystroke": 0.55, "voice": 0.35, "mouse": 0.10}
    weighted_sum = 0.0
    total_weight = 0.0

    if ksd_score is not None:
        weighted_sum += ksd_score * weights["keystroke"]
        total_weight += weights["keystroke"]

    if voice_score is not None:
        weighted_sum += voice_score * weights["voice"]
        total_weight += weights["voice"]

    weighted_sum += mouse_score * weights["mouse"]
    total_weight += weights["mouse"]

    fused_val = (weighted_sum / total_weight) if total_weight > 0 else 0.0

    # Decisive penalty for programmatic keystroke injection
    if is_bot:
        fused_val = max(fused_val, 0.94)

    risk_score = int(round(fused_val * 100))

    # Threat Level Classification
    if risk_score >= 75:
        level = "CRITICAL_THREAT"
        recommendation = "QUARANTINE SESSION IMMEDIATELY: Unauthorized operator or automated macro hijacking."
    elif risk_score >= 50:
        level = "SUSPICIOUS_ANOMALY"
        recommendation = "TRIGGER STEP-UP CHALLENGE: Biometric or MFA verification required."
    elif risk_score >= 26:
        level = "ELEVATED_DRIFT"
        recommendation = "MONITOR: Cadence drift detected (potential fatigue or posture change)."
    else:
        level = "TRUSTED"
        recommendation = "Allow uninterrupted continuous execution. Identity confirmed."

    # MITRE ATT&CK Mapping
    mitre_tags: List[Dict[str, str]] = []
    if is_bot:
        mitre_tags.append({
            "id": "T1056.001",
            "name": "Keylogging / Synthetic Keystroke Injection",
            "description": "Near-zero jitter timing indicates automated keystroke injection script or BadUSB replay attack."
        })

    if risk_score >= 70:
        mitre_tags.append({
            "id": "T1078.003",
            "name": "Valid Accounts: Local Accounts Hijacking",
            "description": "Authorized credential operated by an unregistered physical individual with mismatched motor rhythm."
        })

    if voice_score is not None and voice_score > 0.65:
        mitre_tags.append({
            "id": "T1056",
            "name": "Spoofed Audio / Speaker Discrepancy",
            "description": "Vocal tract resonance and fundamental frequency mismatch against authorized baseline."
        })

    trail.append(f"Threat fusion node: Fused risk {risk_score}% ({level}) with {len(mitre_tags)} MITRE ATT&CK tag(s).")

    return {
        "fused_risk_score": risk_score,
        "threat_level": level,
        "recommendation": recommendation,
        "mitre_tags": mitre_tags,
        "execution_trail": trail
    }


def policy_router_node(state: ZeroTrustGraphState) -> Dict[str, Any]:
    """
    Node 4: Enforces Zero-Trust policy actions based on the classified threat level.
    """
    trail = list(state.get("execution_trail", []))
    level = state.get("threat_level", "TRUSTED")

    if level == "CRITICAL_THREAT":
        action = "QUARANTINE_ISOLATION"
    elif level == "SUSPICIOUS_ANOMALY":
        action = "STEP_UP_CHALLENGE"
    elif level == "ELEVATED_DRIFT":
        action = "SILENT_MONITOR"
    else:
        action = "ALLOW"

    trail.append(f"Policy router: Action enforced -> {action}")

    return {
        "enforcement_action": action,
        "execution_trail": trail
    }


# =========================================================================
# LangGraph StateGraph Compilation
# =========================================================================

def build_zero_trust_graph():
    """
    Compiles the executable LangGraph state machine.
    """
    graph_builder = StateGraph(ZeroTrustGraphState)

    graph_builder.add_node("keystroke_analyzer", keystroke_analyzer_node)
    graph_builder.add_node("voice_analyzer", voice_analyzer_node)
    graph_builder.add_node("threat_fusion", threat_fusion_node)
    graph_builder.add_node("policy_router", policy_router_node)

    graph_builder.add_edge(START, "keystroke_analyzer")
    graph_builder.add_edge("keystroke_analyzer", "voice_analyzer")
    graph_builder.add_edge("voice_analyzer", "threat_fusion")
    graph_builder.add_edge("threat_fusion", "policy_router")
    graph_builder.add_edge("policy_router", END)

    return graph_builder.compile()


# Singleton instance of compiled LangGraph
zero_trust_agent = build_zero_trust_graph()
