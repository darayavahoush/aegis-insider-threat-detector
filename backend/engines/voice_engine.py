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
        # 1. Fundamental Pitch F0 Deviation (allowing natural intonation headroom of 10 Hz)
        pitch_delta = abs(test_v.pitch_mean - base_v.pitch_mean)
        eff_pitch_delta = max(0.0, pitch_delta - 10.0)
        pitch_z = eff_pitch_delta / (base_v.pitch_std * 0.65 + 10.0)

        # 2. Spectral Centroid Deviation (Timbre brightness)
        centroid_delta = abs(test_v.centroid_mean - base_v.centroid_mean)
        eff_centroid_delta = max(0.0, centroid_delta - 60.0)
        centroid_z = eff_centroid_delta / 200.0

        # 3. Formant Energy Ratio (F1 low vocal band 300-1000Hz vs F2 high vocal band 1000-3000Hz)
        test_formant = getattr(test_v, 'formant_ratio', None) or 1.22
        base_formant = getattr(base_v, 'formant_ratio', None) or 1.22
        formant_delta = abs(test_formant - base_formant)
        formant_z = formant_delta / 0.25

        # 4. Zero-Crossing Rate
        test_zcr = getattr(test_v, 'zcr_mean', None) or 0.08
        base_zcr = getattr(base_v, 'zcr_mean', None) or 0.08
        zcr_delta = abs(test_zcr - base_zcr)
        zcr_z = zcr_delta / 0.035

        composite_v_z = 0.50 * pitch_z + 0.25 * centroid_z + 0.18 * formant_z + 0.07 * zcr_z

        # Calibrated Sigmoid Transfer Function (Midpoint Z=1.8, Slope=2.0)
        exponent = -2.0 * (composite_v_z - 1.8)
        exponent = max(-30.0, min(30.0, exponent))
        anomaly_score = 1.0 / (1.0 + math.exp(exponent))
        anomaly_score = max(0.02, min(0.99, anomaly_score))

        details = {
            "pitch_observed_hz": round(test_v.pitch_mean, 1),
            "pitch_baseline_hz": round(base_v.pitch_mean, 1),
            "pitch_delta_hz": round(pitch_delta, 1),
            "centroid_observed_hz": round(test_v.centroid_mean, 1),
            "centroid_baseline_hz": round(base_v.centroid_mean, 1),
            "centroid_delta_hz": round(centroid_delta, 1),
            "formant_delta": round(formant_delta, 2),
            "pitch_z": round(pitch_z, 2),
            "centroid_z": round(centroid_z, 2),
            "composite_voice_z": round(composite_v_z, 2)
        }

        return round(anomaly_score, 3), details
