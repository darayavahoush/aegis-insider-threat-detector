import { useState, useRef, useCallback } from 'react';

export function useKeystrokeCollector() {
  const [keyCount, setKeyCount] = useState(0);
  const [pulseData, setPulseData] = useState([]);
  
  const activeKeys = useRef(new Map());
  const dwellTimes = useRef([]);
  const flightTimes = useRef([]);
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
    flightTimes.current = [];
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
  }, []);

  const handleKeyDown = useCallback((e) => {
    const now = performance.now();
    if (!startTime.current) startTime.current = now;

    const key = e.key;
    const code = e.code;

    if (activeKeys.current.has(code)) return; // Ignore synthetic repeats

    activeKeys.current.set(code, now);
    totalKeysPressed.current++;
    setKeyCount(totalKeysPressed.current);

    if (key === 'Backspace' || key === 'Delete') {
      backspaceCount.current++;
    }

    // Flight time (Release-to-Press)
    if (lastKeyReleaseTime.current !== null) {
      const flight = now - lastKeyReleaseTime.current;
      if (flight >= 0 && flight < 2500) {
        flightTimes.current.push(flight);
      }
    }

    // Press-to-Press and Digraphs
    if (lastKeyPressTime.current !== null) {
      const p2p = now - lastKeyPressTime.current;
      if (p2p >= 0 && p2p < 2500) {
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

    if (activeKeys.current.has(code)) {
      const pressTime = activeKeys.current.get(code);
      const dwell = now - pressTime;
      activeKeys.current.delete(code);

      if (dwell > 0 && dwell < 2000) {
        dwellTimes.current.push(dwell);

        // Update live pulse data for canvas
        setPulseData((prev) => {
          const next = [...prev, { key: e.key, dwell, time: now }];
          return next.slice(-25);
        });
      }
    }

    lastKeyReleaseTime.current = now;
  }, []);

  const getFeatures = useCallback(() => {
    if (dwellTimes.current.length === 0) return null;

    const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const std = (arr, m) => {
      if (arr.length <= 1) return 15;
      const v = arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1);
      return Math.sqrt(v);
    };

    const dwellMean = mean(dwellTimes.current);
    const dwellStd = std(dwellTimes.current, dwellMean);

    const flightMean = flightTimes.current.length ? mean(flightTimes.current) : 120;
    const flightStd = flightTimes.current.length ? std(flightTimes.current, flightMean) : 35;

    const rhythmCV = flightMean > 0 ? (flightStd / flightMean) : 0.3;

    const elapsedMin = startTime.current ? Math.max((performance.now() - startTime.current) / 60000, 0.05) : 0.1;
    const wpm = Math.round((totalKeysPressed.current / 5) / elapsedMin);
    const backspaceRate = totalKeysPressed.current > 0 ? (backspaceCount.current / totalKeysPressed.current) : 0;

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
      flight_mean: Math.round(flightMean),
      flight_std: Math.round(flightStd),
      rhythm_cv: parseFloat(rhythmCV.toFixed(3)),
      wpm,
      backspace_rate: parseFloat(backspaceRate.toFixed(3)),
      digraph_stats: digraphStats
    };
  }, []);

  return {
    keyCount,
    pulseData,
    handleKeyDown,
    handleKeyUp,
    getFeatures,
    reset
  };
}
