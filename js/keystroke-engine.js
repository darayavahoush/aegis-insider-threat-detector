/**
 * AEGIS - Keystroke Dynamics Biometrics Engine
 * Captures sub-millisecond keydown/keyup events, computes dwell times, flight latencies,
 * digraph matrices, rhythm variance, and calculates statistical anomaly distances.
 */

class KeystrokeEngine {
  constructor() {
    this.activeKeys = new Map(); // key -> press timestamp (performance.now())
    this.rawEvents = [];        // recorded stream of key events
    this.dwellTimes = [];       // array of dwell times in ms
    this.flightTimes = [];      // release-to-press latencies in ms
    this.pressToPressTimes = [];// press-to-press latencies in ms
    this.digraphs = new Map();  // 'ab' -> array of latencies
    this.lastKeyReleaseTime = null;
    this.lastKeyPressTime = null;
    this.lastKeyCode = null;
    this.backspaceCount = 0;
    this.totalKeysPressed = 0;
    this.startTime = null;
  }

  reset() {
    this.activeKeys.clear();
    this.rawEvents = [];
    this.dwellTimes = [];
    this.flightTimes = [];
    this.pressToPressTimes = [];
    this.digraphs.clear();
    this.lastKeyReleaseTime = null;
    this.lastKeyPressTime = null;
    this.lastKeyCode = null;
    this.backspaceCount = 0;
    this.totalKeysPressed = 0;
    this.startTime = null;
  }

  handleKeyDown(event) {
    const now = performance.now();
    if (!this.startTime) this.startTime = now;

    const key = event.key;
    const code = event.code;

    // Ignore synthetic repeats when holding key down
    if (this.activeKeys.has(code)) return;

    this.activeKeys.set(code, now);
    this.totalKeysPressed++;

    if (key === 'Backspace' || key === 'Delete') {
      this.backspaceCount++;
    }

    // 1. Flight time (Release-to-Press): latency between last key release and this key press
    if (this.lastKeyReleaseTime !== null) {
      const flightTime = now - this.lastKeyReleaseTime;
      // Filter out huge pauses (e.g. user took a coffee break > 2500ms)
      if (flightTime >= 0 && flightTime < 2500) {
        this.flightTimes.push(flightTime);
      }
    }

    // 2. Press-to-Press time
    if (this.lastKeyPressTime !== null) {
      const p2p = now - this.lastKeyPressTime;
      if (p2p >= 0 && p2p < 2500) {
        this.pressToPressTimes.push(p2p);

        // Digraph tracking if key is printable
        if (this.lastKeyCode && key.length === 1 && this.lastKeyCode.length === 1) {
          const digraph = (this.lastKeyCode + key).toLowerCase();
          if (!this.digraphs.has(digraph)) {
            this.digraphs.set(digraph, []);
          }
          this.digraphs.get(digraph).push(p2p);
        }
      }
    }

    this.lastKeyPressTime = now;
    this.lastKeyCode = key;

    this.rawEvents.push({
      type: 'keydown',
      key,
      code,
      time: now
    });
  }

  handleKeyUp(event) {
    const now = performance.now();
    const code = event.code;

    if (this.activeKeys.has(code)) {
      const pressTime = this.activeKeys.get(code);
      const dwell = now - pressTime;
      this.activeKeys.delete(code);

      if (dwell > 0 && dwell < 2000) {
        this.dwellTimes.push(dwell);
      }

      this.rawEvents.push({
        type: 'keyup',
        key: event.key,
        code,
        time: now,
        dwell
      });
    }

    this.lastKeyReleaseTime = now;
  }

  /**
   * Extract comprehensive feature vector from currently captured keystrokes
   */
  getFeatures() {
    if (this.dwellTimes.length === 0) {
      return null;
    }

    const dwellMean = this._mean(this.dwellTimes);
    const dwellStd = this._std(this.dwellTimes, dwellMean);

    const flightMean = this.flightTimes.length > 0 ? this._mean(this.flightTimes) : 120;
    const flightStd = this.flightTimes.length > 0 ? this._std(this.flightTimes, flightMean) : 35;

    // Rhythm Coefficient of Variation: CV = std / mean
    const rhythmCV = flightMean > 0 ? (flightStd / flightMean) : 0.3;

    // Words per minute (WPM): (totalKeys / 5) / (totalMinutes)
    const elapsedMinutes = this.startTime ? Math.max((performance.now() - this.startTime) / 60000, 0.05) : 0.1;
    const wpm = Math.round((this.totalKeysPressed / 5) / elapsedMinutes);

    // Backspace / error correction ratio
    const backspaceRate = this.totalKeysPressed > 0 ? (this.backspaceCount / this.totalKeysPressed) : 0;

    // Summarize top digraphs
    const digraphStats = {};
    for (const [dg, latencies] of this.digraphs.entries()) {
      if (latencies.length > 0) {
        digraphStats[dg] = {
          mean: Math.round(this._mean(latencies)),
          count: latencies.length
        };
      }
    }

    return {
      keyCount: this.totalKeysPressed,
      dwellMean: Math.round(dwellMean),
      dwellStd: Math.round(dwellStd),
      flightMean: Math.round(flightMean),
      flightStd: Math.round(flightStd),
      rhythmCV: parseFloat(rhythmCV.toFixed(3)),
      wpm,
      backspaceRate: parseFloat(backspaceRate.toFixed(3)),
      digraphStats
    };
  }

  /**
   * Compare a test feature vector against an enrolled baseline template.
   * Returns distance breakdown and keystroke anomaly score [0.0 - 1.0].
   */
  computeAnomaly(testFeatures, baseline) {
    if (!testFeatures || !baseline) return { anomalyScore: 0, confidence: 0, details: {} };

    const eps = 1e-4;

    // 1. Dwell Time Z-score deviation
    const dwellDelta = Math.abs(testFeatures.dwellMean - baseline.dwellMean);
    const dwellZ = dwellDelta / (baseline.dwellStd + 15 + eps);

    // 2. Flight Time Z-score deviation
    const flightDelta = Math.abs(testFeatures.flightMean - baseline.flightMean);
    const flightZ = flightDelta / (baseline.flightStd + 25 + eps);

    // 3. Rhythm Stability deviation (CV)
    const cvDelta = Math.abs(testFeatures.rhythmCV - baseline.rhythmCV);
    const cvZ = cvDelta / 0.15;

    // 4. Digraph Latency matching
    let matchedDigraphs = 0;
    let digraphDistanceSum = 0;

    if (baseline.digraphStats && testFeatures.digraphStats) {
      for (const dg in testFeatures.digraphStats) {
        if (baseline.digraphStats[dg]) {
          const testVal = testFeatures.digraphStats[dg].mean;
          const baseVal = baseline.digraphStats[dg].mean;
          const delta = Math.abs(testVal - baseVal);
          digraphDistanceSum += delta / (baseVal * 0.35 + 20);
          matchedDigraphs++;
        }
      }
    }

    const avgDigraphZ = matchedDigraphs > 0 ? (digraphDistanceSum / matchedDigraphs) : 0.8;

    // 5. Bot / Automation Detection (Zero-variance entropy check)
    // Automated scripts/macros type at virtually 0 jitter (e.g. std < 3ms)
    let isSyntheticBot = false;
    if (testFeatures.keyCount >= 8 && (testFeatures.dwellStd < 3.5 || testFeatures.flightStd < 4.0)) {
      isSyntheticBot = true;
    }

    // Weighted composite Z-score
    let compositeZ = 0.35 * dwellZ + 0.35 * flightZ + 0.15 * cvZ + 0.15 * avgDigraphZ;

    if (isSyntheticBot) {
      compositeZ += 4.0; // Instant severe penalty for synthetic macro replay
    }

    // Transform unbounded Z-score to bounded Anomaly Probability [0, 1] using Sigmoidal / Exponential mapping
    // At Z = 0 -> anomaly = 0
    // At Z = 2.0 -> anomaly ~ 0.63
    // At Z = 3.5 -> anomaly ~ 0.85
    let anomalyScore = 1 - Math.exp(-compositeZ * 0.5);
    anomalyScore = Math.min(Math.max(anomalyScore, 0.0), 1.0);

    // Confidence scales with sample size
    const confidence = Math.min(testFeatures.keyCount / 25, 1.0);

    return {
      anomalyScore: parseFloat(anomalyScore.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(2)),
      isSyntheticBot,
      details: {
        dwellDelta: Math.round(dwellDelta),
        flightDelta: Math.round(flightDelta),
        dwellZ: parseFloat(dwellZ.toFixed(2)),
        flightZ: parseFloat(flightZ.toFixed(2)),
        cvZ: parseFloat(cvZ.toFixed(2)),
        matchedDigraphs,
        compositeZ: parseFloat(compositeZ.toFixed(2))
      }
    };
  }

  _mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((acc, val) => acc + val, 0) / arr.length;
  }

  _std(arr, mean) {
    if (arr.length <= 1) return 15;
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }
}

// Export for ES modules and browser global
if (typeof module !== 'undefined') module.exports = KeystrokeEngine;
if (typeof window !== 'undefined') window.KeystrokeEngine = KeystrokeEngine;
