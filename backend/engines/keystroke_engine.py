import math
from typing import Dict, Any, Tuple
from ..models import KeystrokeFeatureVector

class PythonKeystrokeEngine:
    """
    Evaluates keystroke dynamics feature vectors against enrolled baseline profiles
    using standardized multi-variate Z-scores and exponential anomaly mapping.
    """

    @staticmethod
    def evaluate(test_k: KeystrokeFeatureVector, base_k: KeystrokeFeatureVector) -> Tuple[float, Dict[str, Any]]:
        eps = 1e-4

        # 1. Dwell Time Deviation
        dwell_delta = abs(test_k.dwell_mean - base_k.dwell_mean)
        dwell_z = dwell_delta / (base_k.dwell_std + 15.0 + eps)

        # 2. Flight Time Deviation
        flight_delta = abs(test_k.flight_mean - base_k.flight_mean)
        flight_z = flight_delta / (base_k.flight_std + 25.0 + eps)

        # 3. Rhythm Stability (CV) Deviation
        cv_delta = abs(test_k.rhythm_cv - base_k.rhythm_cv)
        cv_z = cv_delta / 0.15

        # 4. Digraph Latencies Comparison
        matched_digraphs = 0
        digraph_distance_sum = 0.0

        if test_k.digraph_stats and base_k.digraph_stats:
            for dg, test_stat in test_k.digraph_stats.items():
                if dg in base_k.digraph_stats:
                    base_val = base_k.digraph_stats[dg].mean
                    delta = abs(test_stat.mean - base_val)
                    digraph_distance_sum += delta / (base_val * 0.35 + 20.0)
                    matched_digraphs += 1

        avg_digraph_z = (digraph_distance_sum / matched_digraphs) if matched_digraphs > 0 else 0.8

        # 5. Synthetic Keystroke Injection Detection (Zero-variance entropy check)
        is_synthetic = bool(
            test_k.is_synthetic_bot or 
            (test_k.key_count >= 8 and (test_k.dwell_std < 3.5 or test_k.flight_std < 4.0))
        )

        # Composite Z-score
        composite_z = 0.35 * dwell_z + 0.35 * flight_z + 0.15 * cv_z + 0.15 * avg_digraph_z

        if is_synthetic:
            composite_z += 4.5  # Heavy penalty for automated macro injection

        # Exponential Sigmoidal Anomaly Mapping [0.0 - 1.0]
        anomaly_score = 1.0 - math.exp(-composite_z * 0.5)
        anomaly_score = max(0.0, min(1.0, anomaly_score))

        details = {
            "dwell_delta_ms": round(dwell_delta, 1),
            "flight_delta_ms": round(flight_delta, 1),
            "dwell_z": round(dwell_z, 2),
            "flight_z": round(flight_z, 2),
            "cv_z": round(cv_z, 2),
            "composite_z": round(composite_z, 2),
            "matched_digraphs": matched_digraphs,
            "is_synthetic_bot": is_synthetic
        }

        return round(anomaly_score, 3), details
