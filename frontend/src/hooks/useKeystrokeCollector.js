import { useState, useRef, useCallback } from 'react';

/**
 * High-Resolution Keystroke Biometrics Collector
 * - Sub-millisecond dwell tracking with letter vs. spacebar partitioning
 * - Cognitive pause filtering (<650ms motor execution vs >650ms thinking latency)
 * - Digraph timing latency extractor
 * - Live stroke oscilloscope pulse generator & real-time cadence metrics
 */
export function useKeystrokeCollector() {
  const [keyCount, setKeyCount] = useState(0);
  const [pulseData, setPulseData] = useState([]);
  const [cadence, setCadence] = useState({
    dwellLetter: 0,
    dwellSpace: 0,
    flightMotor: 0,
    lastDwell: 0,
    wpm: 0
  });

  const activeKeys = useRef(new Map());
  const dwellTimes = useRef([]);
  const dwellLetterTimes = useRef([]);
  const dwellSpaceTimes = useRef([]);

  const flightTimes = useRef([]);
  const motorFlightTimes = useRef([]);
  const cognitivePauses = useRef([]);

  const pressToPressTimes = useRef([]);
  const digraphs = useRef(new Map());

  const lastKeyReleaseTime = useRef(null);
  const lastKeyPressTime = useRef(null);
  const lastKeyCode = useRef(null);
  const backspaceCount = useRef(0);
  const totalKeysPressed = useRef(0);
  const startTime = useRef(null);

  const reset = useCallback(() => {
    activeKeys.current.clear();
    dwellTimes.current = [];
    dwellLetterTimes.current = [];
    dwellSpaceTimes.current = [];
    flightTimes.current = [];
    motorFlightTimes.current = [];
    cognitivePauses.current = [];
    pressToPressTimes.current = [];
    digraphs.current.clear();
    lastKeyReleaseTime.current = null;
    lastKeyPressTime.current = null;
    lastKeyCode.current = null;
    backspaceCount.current = 0;
    totalKeysPressed.current = 0;
    startTime.current = null;

    setKeyCount(0);
    setPulseData([]);
    setCadence({
      dwellLetter: 0,
      dwellSpace: 0,
      flightMotor: 0,
      lastDwell: 0,
      wpm: 0
    });
  }, []);

  const handleKeyDown = useCallback((e) => {
    const now = performance.now();
    if (!startTime.current) startTime.current = now;

    const key = e.key;
    const code = e.code;

    // Ignore synthetic repeats when key is held down
    if (activeKeys.current.has(code)) return;

    activeKeys.current.set(code, now);
    totalKeysPressed.current++;
    setKeyCount(totalKeysPressed.current);

    if (key === 'Backspace' || key === 'Delete') {
      backspaceCount.current++;
    }

    // Flight time (Release-to-Press)
    if (lastKeyReleaseTime.current !== null) {
      const flight = now - lastKeyReleaseTime.current;
      if (flight >= 10 && flight < 3000) {
        flightTimes.current.push(flight);
        if (flight <= 650) {
          motorFlightTimes.current.push(flight); // Pure intra-word motor execution
        } else {
          cognitivePauses.current.push(flight);  // Cognitive thinking pause / inter-word hesitation
        }
      }
    }

    // Press-to-Press and Digraphs
    if (lastKeyPressTime.current !== null) {
      const p2p = now - lastKeyPressTime.current;
      if (p2p >= 15 && p2p < 2500) {
        pressToPressTimes.current.push(p2p);

        if (lastKeyCode.current && key.length === 1 && lastKeyCode.current.length === 1) {
          const dg = (lastKeyCode.current + key).toLowerCase();
          if (!digraphs.current.has(dg)) {
            digraphs.current.set(dg, []);
          }
          digraphs.current.get(dg).push(p2p);
        }
      }
    }

    lastKeyPressTime.current = now;
    lastKeyCode.current = key;
  }, []);

  const handleKeyUp = useCallback((e) => {
    const now = performance.now();
    const code = e.code;
    const key = e.key;

    if (activeKeys.current.has(code)) {
      const pressTime = activeKeys.current.get(code);
      const dwell = now - pressTime;
      activeKeys.current.delete(code);

      if (dwell > 15 && dwell < 1800) {
        dwellTimes.current.push(dwell);

        const isSpaceOrEnter = code === 'Space' || code === 'Enter';
        if (isSpaceOrEnter) {
          dwellSpaceTimes.current.push(dwell);
        } else if (key.length === 1) {
          dwellLetterTimes.current.push(dwell);
        }

        // Live oscilloscope pulse data
        setPulseData((prev) => {
          const next = [...prev, { key: isSpaceOrEnter ? '␣' : key, dwell, time: now }];
          return next.slice(-28);
        });

        // Compute quick running cadence stats
        const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
        const lMean = mean(dwellLetterTimes.current) || dwell;
        const sMean = mean(dwellSpaceTimes.current) || 180;
        const fMean = mean(motorFlightTimes.current) || 120;

        const elapsedMin = startTime.current
          ? Math.max((now - startTime.current) / 60000, 0.05)
          : 0.1;
        const currentWpm = Math.round((totalKeysPressed.current / 5) / elapsedMin);

        setCadence({
          dwellLetter: Math.round(lMean),
          dwellSpace: Math.round(sMean),
          flightMotor: Math.round(fMean),
          lastDwell: Math.round(dwell),
          wpm: currentWpm
        });
      }
    }

    lastKeyReleaseTime.current = now;
  }, []);

  const getFeatures = useCallback(() => {
    if (dwellTimes.current.length === 0) return null;

    const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const std = (arr, m) => {
      if (arr.length <= 1) return 18;
      const v = arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1);
      return Math.sqrt(v);
    };

    const dwellMean = mean(dwellTimes.current);
    const dwellStd = std(dwellTimes.current, dwellMean);

    const dwellLetterMean = dwellLetterTimes.current.length
      ? mean(dwellLetterTimes.current)
      : dwellMean;
    const dwellSpaceMean = dwellSpaceTimes.current.length
      ? mean(dwellSpaceTimes.current)
      : dwellMean * 1.65;

    const flightMean = flightTimes.current.length ? mean(flightTimes.current) : 135;
    const flightStd = flightTimes.current.length ? std(flightTimes.current, flightMean) : 38;

    const flightMotorMean = motorFlightTimes.current.length
      ? mean(motorFlightTimes.current)
      : flightMean;

    const pauseCount = cognitivePauses.current.length;
    const pauseRate = totalKeysPressed.current > 0 ? pauseCount / totalKeysPressed.current : 0;

    const rhythmCV = flightMotorMean > 0 ? flightStd / flightMotorMean : 0.3;

    const elapsedMin = startTime.current
      ? Math.max((performance.now() - startTime.current) / 60000, 0.05)
      : 0.1;
    const wpm = Math.round((totalKeysPressed.current / 5) / elapsedMin);
    const backspaceRate =
      totalKeysPressed.current > 0 ? backspaceCount.current / totalKeysPressed.current : 0;

    const digraphStats = {};
    for (const [dg, latencies] of digraphs.current.entries()) {
      if (latencies.length > 0) {
        digraphStats[dg] = {
          mean: Math.round(mean(latencies)),
          count: latencies.length
        };
      }
    }

    return {
      key_count: totalKeysPressed.current,
      dwell_mean: Math.round(dwellMean),
      dwell_std: Math.round(dwellStd),
      dwell_letter_mean: Math.round(dwellLetterMean),
      dwell_space_mean: Math.round(dwellSpaceMean),
      flight_mean: Math.round(flightMean),
      flight_std: Math.round(flightStd),
      flight_motor_mean: Math.round(flightMotorMean),
      pause_rate: parseFloat(pauseRate.toFixed(3)),
      rhythm_cv: parseFloat(rhythmCV.toFixed(3)),
      wpm,
      backspace_rate: parseFloat(backspaceRate.toFixed(3)),
      digraph_stats: digraphStats
    };
  }, []);

  return {
    keyCount,
    pulseData,
    cadence,
    handleKeyDown,
    handleKeyUp,
    getFeatures,
    reset
  };
}
