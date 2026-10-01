/**
 * AEGIS - Presets for Authorized Employee Baselines and Adversary Personas
 */

const PRESET_PROFILES = {
  sarah_vance: {
    id: 'sarah_vance',
    name: 'Sarah Vance',
    role: 'Lead Cloud Security Analyst',
    department: 'Threat Operations',
    clearance: 'Level-4 (Restricted Systems)',
    keystrokeBaseline: {
      dwellMean: 95,
      dwellStd: 18,
      flightMean: 120,
      flightStd: 30,
      rhythmCV: 0.25,
      wpm: 68,
      backspaceRate: 0.03,
      digraphStats: {
        'th': { mean: 98, count: 24 },
        'he': { mean: 92, count: 20 },
        'in': { mean: 110, count: 18 },
        'er': { mean: 105, count: 22 },
        'an': { mean: 115, count: 15 },
        're': { mean: 102, count: 19 },
        'on': { mean: 112, count: 14 }
      }
    },
    voiceBaseline: {
      pitchMean: 195,
      pitchStd: 20,
      centroidMean: 1740,
      rmsMean: 0.22,
      zcrMean: 0.082
    }
  },
  david_chen: {
    id: 'david_chen',
    name: 'David Chen',
    role: 'Staff Database Architect',
    department: 'Core Infrastructure',
    clearance: 'Level-5 (Global Admin)',
    keystrokeBaseline: {
      dwellMean: 125,
      dwellStd: 24,
      flightMean: 165,
      flightStd: 42,
      rhythmCV: 0.26,
      wpm: 50,
      backspaceRate: 0.05,
      digraphStats: {
        'se': { mean: 140, count: 30 },
        'le': { mean: 135, count: 25 },
        'ct': { mean: 155, count: 28 },
        'fr': { mean: 148, count: 22 },
        'om': { mean: 138, count: 24 }
      }
    },
    voiceBaseline: {
      pitchMean: 118,
      pitchStd: 14,
      centroidMean: 1420,
      rmsMean: 0.20,
      zcrMean: 0.075
    }
  }
};

const ATTACK_SCENARIOS = {
  legitimate_user: {
    title: 'Legitimate Authorized Employee',
    tag: 'BENIGN_AUTHENTICATED',
    desc: 'Simulates normal authentic employee workflow with rhythmic typing matching enrolled biometric muscle memory.',
    keystrokeSim: {
      dwellMean: 96,
      dwellStd: 19,
      flightMean: 122,
      flightStd: 32,
      rhythmCV: 0.26,
      wpm: 67,
      backspaceRate: 0.03,
      keyCount: 35,
      digraphStats: {
        'th': { mean: 100 },
        'he': { mean: 94 },
        'in': { mean: 112 }
      }
    },
    voiceSim: {
      pitchMean: 194,
      centroidMean: 1735,
      rmsMean: 0.21,
      zcrMean: 0.080
    }
  },
  unauthorized_impersonator: {
    title: 'Physical Impersonator / Stolen Session',
    tag: 'MITRE T1078.003',
    desc: 'An unauthorized colleague or intruder sits at an unattended terminal. Typing rhythm is hesitative, slow, and jerky.',
    keystrokeSim: {
      dwellMean: 210,
      dwellStd: 65,
      flightMean: 340,
      flightStd: 120,
      rhythmCV: 0.55,
      wpm: 28,
      backspaceRate: 0.18,
      keyCount: 32,
      digraphStats: {
        'th': { mean: 290 },
        'he': { mean: 310 },
        'in': { mean: 275 }
      }
    },
    voiceSim: {
      pitchMean: 115, // Wrong pitch completely
      centroidMean: 1250,
      rmsMean: 0.14,
      zcrMean: 0.055
    }
  },
  synthetic_bot: {
    title: 'Automated Keystroke Injection (BadUSB/Macro)',
    tag: 'MITRE T1056.001',
    desc: 'A hardware implant or malware script injects keystrokes at fixed millisecond delays with zero human jitter variance.',
    keystrokeSim: {
      dwellMean: 45,
      dwellStd: 1.2, // Near zero variance
      flightMean: 50,
      flightStd: 1.5,
      rhythmCV: 0.03,
      wpm: 180,
      backspaceRate: 0.00,
      keyCount: 60,
      digraphStats: {
        'th': { mean: 50 },
        'he': { mean: 50 },
        'in': { mean: 50 }
      }
    },
    voiceSim: null
  },
  coerced_insider: {
    title: 'Insider Under Duress / Panic Flight',
    tag: 'BEHAVIORAL_ANOMALY',
    desc: 'Authorized employee under duress or panic: erratic typing bursts, heavy backspaces, elevated flight jitter.',
    keystrokeSim: {
      dwellMean: 70,
      dwellStd: 38,
      flightMean: 215,
      flightStd: 95,
      rhythmCV: 0.48,
      wpm: 48,
      backspaceRate: 0.22,
      keyCount: 40,
      digraphStats: {
        'th': { mean: 175 },
        'he': { mean: 160 }
      }
    },
    voiceSim: {
      pitchMean: 245, // Elevated pitch under stress
      centroidMean: 1980,
      rmsMean: 0.35,
      zcrMean: 0.11
    }
  }
};

if (typeof module !== 'undefined') module.exports = { PRESET_PROFILES, ATTACK_SCENARIOS };
if (typeof window !== 'undefined') {
  window.PRESET_PROFILES = PRESET_PROFILES;
  window.ATTACK_SCENARIOS = ATTACK_SCENARIOS;
}
