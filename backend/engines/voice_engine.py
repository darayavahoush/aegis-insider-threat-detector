import math
from typing import Dict, Any, Tuple
from ..models import VoiceFeatureVector

class PythonVoiceEngine:
    """
    Evaluates acoustic vocal tract characteristics (Fundamental Pitch F0,
    Spectral Centroid, Energy RMS, and Zero-Crossing Rate) against enrolled baseline.
    """

    @staticmethod
    def evaluate(test_v: VoiceFeatureVector, base_v: VoiceFeatureVector) -> Tuple[float, Dict[str, Any]]:
        # 1. Pitch F0 Deviation
        pitch_delta = abs(test_v.pitch_mean - base_v.pitch_mean)
        pitch_z = pitch_delta / (base_v.pitch_std + 12.0)

        # 2. Spectral Centroid Deviation
        centroid_delta = abs(test_v.centroid_mean - base_v.centroid_mean)
        centroid_z = centroid_delta / 280.0

        # 3. ZCR Deviation
        zcr_delta = abs((test_v.zcr_mean or 0.08) - (base_v.zcr_mean or 0.08))
        zcr_z = zcr_delta / 0.035

        composite_v_z = 0.50 * pitch_z + 0.35 * centroid_z + 0.15 * zcr_z
        anomaly_score = 1.0 - math.exp(-composite_v_z * 0.45)
        anomaly_score = max(0.0, min(1.0, anomaly_score))

        details = {
            "pitch_delta_hz": round(pitch_delta, 1),
            "centroid_delta_hz": round(centroid_delta, 1),
            "pitch_z": round(pitch_z, 2),
            "centroid_z": round(centroid_z, 2),
            "composite_voice_z": round(composite_v_z, 2)
        }

        return round(anomaly_score, 3), details
