from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

class DigraphDetail(BaseModel):
    mean: float
    count: Optional[int] = 1

class KeystrokeFeatureVector(BaseModel):
    key_count: int = Field(default=0, description="Total keypresses captured")
    dwell_mean: float = Field(description="Mean dwell time in ms")
    dwell_std: float = Field(default=15.0, description="Std dev of dwell times")
    dwell_letter_mean: Optional[float] = Field(default=None, description="Mean dwell time for letter keys in ms")
    dwell_space_mean: Optional[float] = Field(default=None, description="Mean dwell time for spacebar in ms")
    flight_mean: float = Field(description="Mean release-to-press flight time in ms")
    flight_std: float = Field(default=30.0, description="Std dev of flight times")
    flight_motor_mean: Optional[float] = Field(default=None, description="Filtered intra-word motor flight time (<650ms) in ms")
    pause_rate: Optional[float] = Field(default=0.0, description="Ratio of cognitive pauses (>650ms)")
    rhythm_cv: float = Field(description="Rhythm coefficient of variation (std / mean)")
    wpm: int = Field(default=50, description="Calculated words per minute")
    backspace_rate: float = Field(default=0.0, description="Correction / backspace ratio")
    digraph_stats: Optional[Dict[str, DigraphDetail]] = Field(default_factory=dict)
    is_synthetic_bot: Optional[bool] = False

class VoiceFeatureVector(BaseModel):
    pitch_mean: float = Field(description="Fundamental frequency F0 in Hz")
    pitch_std: Optional[float] = Field(default=18.0, description="Pitch standard deviation")
    centroid_mean: float = Field(description="Spectral centroid timbre brightness in Hz")
    formant_ratio: Optional[float] = Field(default=1.2, description="Formant energy ratio: 300-1000Hz vs 1000-3000Hz")
    spectral_rolloff: Optional[float] = Field(default=2800.0, description="Spectral roll-off frequency 85% energy in Hz")
    hnr: Optional[float] = Field(default=14.0, description="Harmonics-to-noise ratio in dB")
    rms_mean: Optional[float] = Field(default=0.18, description="Root-mean-square audio energy")
    zcr_mean: Optional[float] = Field(default=0.08, description="Zero-crossing rate")
    sample_count: Optional[int] = Field(default=20, description="Sampled audio frames")

class MouseContextVector(BaseModel):
    anomaly_score: float = Field(default=0.05, description="Auxiliary mouse movement anomaly [0, 1]")
    velocity_variance: Optional[float] = 0.2
    curvature_ratio: Optional[float] = 1.1

class MitreTag(BaseModel):
    id: str
    name: str
    description: str

class BreakdownScores(BaseModel):
    keystroke_anomaly: int
    voice_anomaly: Optional[int] = None
    mouse_anomaly: int = 5

class ThreatAssessmentResponse(BaseModel):
    timestamp: str
    risk_score: int = Field(description="Fused risk index [0 - 100]%")
    fused_anomaly: float = Field(description="Raw continuous anomaly score [0.0 - 1.0]")
    level: str = Field(description="TRUSTED, ELEVATED_DRIFT, SUSPICIOUS_ANOMALY, or CRITICAL_THREAT")
    status_class: str
    recommendation: str
    mitre_tags: List[MitreTag] = Field(default_factory=list)
    breakdown: BreakdownScores
    details: Dict[str, Any] = Field(default_factory=dict)

class TelemetryEvaluationRequest(BaseModel):
    profile_id: str = "sarah_vance"
    keystrokes: Optional[KeystrokeFeatureVector] = None
    voice: Optional[VoiceFeatureVector] = None
    mouse_context: Optional[MouseContextVector] = None

class ProfileEnrollmentRequest(BaseModel):
    id: str
    name: str
    role: str
    department: str
    clearance: str
    keystroke_baseline: KeystrokeFeatureVector
    voice_baseline: Optional[VoiceFeatureVector] = None

class AuditEvent(BaseModel):
    id: str
    timestamp: str
    profile_id: str
    level: str
    risk_score: int
    dwell_delta: str
    voice_delta: str
    mitre: str
    action: str
