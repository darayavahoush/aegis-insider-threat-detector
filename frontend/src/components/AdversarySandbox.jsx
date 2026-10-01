import React from 'react';
import { Skull, Bot, UserX, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

const SCENARIOS = [
  {
    key: 'legitimate_user',
    title: '🟢 Legitimate Authorized Employee',
    badge: 'BENIGN AUTHENTICATED',
    badgeClass: 'badge-info',
    desc: 'Employee Sarah Vance typing standard incident response notes. Dwell and flight latencies strictly match her enrolled muscle memory. Risk score remains < 15%.',
    payload: {
      keystrokes: {
        key_count: 35,
        dwell_mean: 96,
        dwell_std: 19,
        flight_mean: 122,
        flight_std: 32,
        rhythm_cv: 0.26,
        wpm: 67,
        backspace_rate: 0.03,
        digraph_stats: {
          th: { mean: 100, count: 10 },
          he: { mean: 94, count: 8 },
          in: { mean: 112, count: 9 }
        },
        is_synthetic_bot: false
      },
      voice: {
        pitch_mean: 194,
        centroid_mean: 1735,
        rms_mean: 0.21,
        zcr_mean: 0.08
      }
    }
  },
  {
    key: 'unauthorized_impersonator',
    title: '🔴 Physical Impersonator (Stolen Console)',
    badge: 'MITRE T1078.003',
    badgeClass: 'badge-danger',
    desc: 'An unauthorized colleague sits down at an unattended unlocked laptop. Slow hunt-and-peck typing (dwell 210ms vs 95ms), erratic digraph transitions. Immediate 88% Critical Threat alert.',
    payload: {
      keystrokes: {
        key_count: 32,
        dwell_mean: 210,
        dwell_std: 65,
        flight_mean: 340,
        flight_std: 120,
        rhythm_cv: 0.55,
        wpm: 28,
        backspace_rate: 0.18,
        digraph_stats: {
          th: { mean: 290, count: 4 },
          he: { mean: 310, count: 3 },
          in: { mean: 275, count: 5 }
        },
        is_synthetic_bot: false
      },
      voice: {
        pitch_mean: 115,
        centroid_mean: 1250,
        rms_mean: 0.14,
        zcr_mean: 0.055
      }
    }
  },
  {
    key: 'synthetic_bot',
    title: '🟣 Synthetic Keystroke Injection (BadUSB / Macro)',
    badge: 'MITRE T1056.001',
    badgeClass: 'badge-mitre',
    desc: 'A rogue Rubber Ducky / BadUSB script injects commands with near-zero millisecond variance (jitter < 2ms). Entropy test flags synthetic automated execution.',
    payload: {
      keystrokes: {
        key_count: 60,
        dwell_mean: 45,
        dwell_std: 1.2,
        flight_mean: 50,
        flight_std: 1.5,
        rhythm_cv: 0.03,
        wpm: 180,
        backspace_rate: 0.0,
        digraph_stats: {
          th: { mean: 50, count: 12 },
          he: { mean: 50, count: 12 },
          in: { mean: 50, count: 12 }
        },
        is_synthetic_bot: true
      },
      voice: null
    }
  },
  {
    key: 'coerced_insider',
    title: '🟠 Coerced Insider Under Duress',
    badge: 'BEHAVIORAL DRIFT',
    badgeClass: 'badge-warn',
    desc: 'Authorized employee being forced to exfiltrate keys under extreme panic. Elevated backspace error rate (22%), irregular cadence, higher vocal pitch. Triggers silent duress flag.',
    payload: {
      keystrokes: {
        key_count: 40,
        dwell_mean: 70,
        dwell_std: 38,
        flight_mean: 215,
        flight_std: 95,
        rhythm_cv: 0.48,
        wpm: 48,
        backspace_rate: 0.22,
        digraph_stats: {
          th: { mean: 175, count: 6 },
          he: { mean: 160, count: 5 }
        },
        is_synthetic_bot: false
      },
      voice: {
        pitch_mean: 245,
        centroid_mean: 1980,
        rms_mean: 0.35,
        zcr_mean: 0.11
      }
    }
  }
];

export default function AdversarySandbox({ onInjectScenario }) {
  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <Skull size={18} /> Insider Threat Attack Simulation & Adversary Personas
        </div>
        <span className="card-tag">RED TEAM EXPLOIT SANDBOX</span>
      </div>

      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Select an attack persona or scenario to inject its behavioral telemetry into the Aegis FastAPI engine. Observe
        how the multi-modal fusion pipeline categorizes risk, generates MITRE ATT&CK tags, and executes defensive
        countermeasures.
      </p>

      <div className="grid-2">
        {SCENARIOS.map((sc) => (
          <div key={sc.key} className="scenario-card">
            <div className="scenario-header">
              <span className="scenario-title">{sc.title}</span>
              <span className={`log-badge ${sc.badgeClass}`}>{sc.badge}</span>
            </div>
            <div className="scenario-desc">{sc.desc}</div>
            <div style={{ marginTop: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => onInjectScenario(sc)}
              >
                <Zap size={14} /> Inject {sc.title.split(' ')[1]} Vector
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
