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

        # 1. Dwell Time Deviation (Prefer letter-specific dwell if available to avoid spacebar skew)
        test_dwell = test_k.dwell_letter_mean if test_k.dwell_letter_mean is not None else test_k.dwell_mean
        base_dwell = base_k.dwell_letter_mean if getattr(base_k, 'dwell_letter_mean', None) is not None else base_k.dwell_mean
        dwell_delta = abs(test_dwell - base_dwell)
        dwell_z = dwell_delta / (base_k.dwell_std + 22.0 + eps)

        # Spacebar Dwell check if available
        space_z = 0.0
        if test_k.dwell_space_mean and getattr(base_k, 'dwell_space_mean', None):
            space_delta = abs(test_k.dwell_space_mean - base_k.dwell_space_mean)
            space_z = space_delta / 45.0
            # Blend space into dwell_z gently
            dwell_z = 0.80 * dwell_z + 0.20 * space_z

        # 2. Flight Time Deviation (Prefer motor flight < 650ms to ignore thinking pauses)
        test_flight = test_k.flight_motor_mean if test_k.flight_motor_mean is not None else test_k.flight_mean
        base_flight = base_k.flight_motor_mean if getattr(base_k, 'flight_motor_mean', None) is not None else base_k.flight_mean
        flight_delta = abs(test_flight - base_flight)
        flight_z = flight_delta / (base_k.flight_std + 35.0 + eps)

        # 3. Rhythm Stability (CV) Deviation
        cv_delta = abs(test_k.rhythm_cv - base_k.rhythm_cv)
        cv_z = cv_delta / 0.18

        # 4. Digraph Latencies Comparison
        matched_digraphs = 0
        digraph_distance_sum = 0.0

        if test_k.digraph_stats and base_k.digraph_stats:
            for dg, test_stat in test_k.digraph_stats.items():
                if dg in base_k.digraph_stats:
                    base_val = base_k.digraph_stats[dg].mean
                    delta = abs(test_stat.mean - base_val)
                    digraph_distance_sum += delta / (base_val * 0.35 + 25.0)
                    matched_digraphs += 1

        avg_digraph_z = (digraph_distance_sum / matched_digraphs) if matched_digraphs > 0 else 0.6

        # 5. Synthetic Keystroke Injection Detection (Zero-variance entropy check)
        is_synthetic = bool(
            test_k.is_synthetic_bot or 
            (test_k.key_count >= 8 and (test_k.dwell_std < 3.2 or test_k.flight_std < 3.5))
        )

        # Composite Motor Distance
        composite_z = 0.38 * dwell_z + 0.38 * flight_z + 0.12 * cv_z + 0.12 * avg_digraph_z

        if is_synthetic:
            composite_z += 5.0  # Heavy penalty for automated macro injection

        # Calibrated Sigmoid Transfer Function (Midpoint Z=1.8, Slope=2.0)
        # Guarantees that normal human variation (Z <= 1.2) remains in the 5-20% risk (80-95% confidence) range
        # while stranger typing (Z >= 2.5) rises to 80-95% threat anomaly
        exponent = -2.0 * (composite_z - 1.8)
        # Guard against math overflow
        exponent = max(-30.0, min(30.0, exponent))
        anomaly_score = 1.0 / (1.0 + math.exp(exponent))
        anomaly_score = max(0.02, min(0.99, anomaly_score))

        details = {
            "dwell_observed_ms": round(test_dwell, 1),
            "dwell_baseline_ms": round(base_dwell, 1),
            "dwell_delta_ms": round(dwell_delta, 1),
            "flight_observed_ms": round(test_flight, 1),
            "flight_baseline_ms": round(base_flight, 1),
            "flight_delta_ms": round(flight_delta, 1),
            "dwell_z": round(dwell_z, 2),
            "flight_z": round(flight_z, 2),
            "cv_z": round(cv_z, 2),
            "composite_z": round(composite_z, 2),
            "matched_digraphs": matched_digraphs,
            "is_synthetic_bot": is_synthetic
        }

        return round(anomaly_score, 3), details
