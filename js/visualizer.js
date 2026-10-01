/**
 * AEGIS - Canvas Telemetry & Biometrics Visualizer
 * Renders real-time audio waveforms, frequency spectrums, keystroke dynamics pulses,
 * and continuous risk trend lines.
 */

class Visualizer {
  constructor() {
    this.keystrokePulses = [];
    this.riskPoints = [];
    this.maxPoints = 40;
  }

  /**
   * Draw audio time-domain waveform
   */
  drawWaveform(canvas, timeData, color = '#00f0ff') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!timeData || timeData.length === 0) {
      // Draw idle flat line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath();

    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i];
      const y = (v + 1) / 2 * height;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }

  /**
   * Draw frequency spectrum FFT bars
   */
  drawSpectrum(canvas, freqData) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    if (!freqData || freqData.length === 0) return;

    const barCount = 48;
    const barWidth = (width / barCount) - 2;
    const step = Math.floor(freqData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const val = freqData[i * step] / 255;
      const barHeight = val * (height - 10);
      const x = i * (barWidth + 2);
      const y = height - barHeight;

      const grad = ctx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, '#00f0ff');
      grad.addColorStop(0.7, '#38bdf8');
      grad.addColorStop(1, '#a855f7');

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  /**
   * Add a keystroke pulse for real-time visualization
   */
  addKeystrokePulse(key, dwell) {
    this.keystrokePulses.push({
      key,
      dwell: Math.min(Math.max(dwell, 30), 400),
      time: performance.now(),
      alpha: 1.0
    });
    if (this.keystrokePulses.length > 25) {
      this.keystrokePulses.shift();
    }
  }

  /**
   * Render keystroke timing oscilloscope
   */
  drawKeystrokeStream(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Draw baseline guideline
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();

    const now = performance.now();
    const count = this.keystrokePulses.length;

    if (count === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('Awaiting live keystroke events... Type into the terminal above.', 15, height / 2 + 4);
      return;
    }

    const spacing = width / Math.max(count + 1, 10);

    for (let i = 0; i < count; i++) {
      const p = this.keystrokePulses[i];
      const age = (now - p.time) / 1000;
      const alpha = Math.max(0.2, 1.0 - (age * 0.08));

      const barH = (p.dwell / 400) * (height - 40);
      const x = (i + 1) * spacing;
      const y = (height - 20) - barH;

      // Color code dwell time (typical: 70-130ms is normal green, >200ms is slow amber)
      let color = '#10b981';
      if (p.dwell > 170) color = '#f59e0b';
      if (p.dwell > 280) color = '#ef4444';

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x - 5, y, 10, barH);

      // Draw key label
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      const label = p.key.length === 1 ? p.key : p.key.substring(0, 3);
      ctx.fillText(label, x, height - 6);

      // Draw dwell value on top
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${Math.round(p.dwell)}ms`, x, y - 4);
    }

    ctx.globalAlpha = 1.0;
  }

  /**
   * Draw continuous threat risk score timeline
   */
  drawRiskTimeline(canvas, latestScore) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    if (typeof latestScore === 'number') {
      this.riskPoints.push(latestScore);
      if (this.riskPoints.length > this.maxPoints) {
        this.riskPoints.shift();
      }
    }

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Draw risk threshold lines
    // 75% Critical
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.25);
    ctx.lineTo(width, height * 0.25);
    ctx.stroke();

    // 50% Suspicious
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.riskPoints.length < 2) return;

    const step = width / (this.maxPoints - 1);

    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let i = 0; i < this.riskPoints.length; i++) {
      const score = this.riskPoints[i];
      const x = i * step;
      const y = height - (score / 100 * (height - 16)) - 8;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const lastScore = this.riskPoints[this.riskPoints.length - 1];
    let strokeColor = '#10b981';
    if (lastScore >= 50) strokeColor = '#f59e0b';
    if (lastScore >= 75) strokeColor = '#ef4444';

    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    // Glow dot on latest point
    const lastX = (this.riskPoints.length - 1) * step;
    const lastY = height - (lastScore / 100 * (height - 16)) - 8;
    ctx.fillStyle = strokeColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = strokeColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

if (typeof module !== 'undefined') module.exports = Visualizer;
if (typeof window !== 'undefined') window.Visualizer = Visualizer;
