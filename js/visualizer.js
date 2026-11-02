/**
 * HarmoniQ Canvas Visualizer – Red & Black Aesthetic
 * Real-time audio spectrum visualization engine supporting:
 * 1. Crimson Spectrum Frequency Bars
 * 2. Radial Pulsing Halo
 * 3. Fluid Waveform Oscilloscope
 */

class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.mode = "bars"; // "bars", "radial", "wave"
    this.animationId = null;
    this.idlePhase = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.start();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 240) * dpr;
    this.canvas.height = (rect.height || 48) * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width || 240;
    this.height = rect.height || 48;
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isPlaying = audio && audio.isPlaying;
    const freqData = isPlaying ? audio.getFrequencyData() : null;

    if (this.mode === "bars") {
      this.drawBars(freqData, isPlaying);
    } else if (this.mode === "radial") {
      this.drawRadial(freqData, isPlaying);
    } else {
      this.drawWave(freqData, isPlaying);
    }
  }

  drawBars(freqData, isPlaying) {
    const barCount = 28;
    const gap = 2;
    const barWidth = (this.width - (barCount - 1) * gap) / barCount;
    this.idlePhase += 0.04;

    for (let i = 0; i < barCount; i++) {
      let val = 0;
      if (isPlaying && freqData && freqData.length > i * 2) {
        val = freqData[i * 2] / 255;
      } else {
        val = Math.sin(this.idlePhase + i * 0.28) * 0.08 + 0.12;
      }

      const barHeight = Math.max(2, val * (this.height - 4));
      const x = i * (barWidth + gap);
      const y = this.height - barHeight;

      // Crimson to bright red gradient
      const gradient = this.ctx.createLinearGradient(0, this.height, 0, y);
      gradient.addColorStop(0, "#990000");
      gradient.addColorStop(0.5, "#e50914");
      gradient.addColorStop(1, "#ff334b");

      this.ctx.fillStyle = gradient;
      this.roundRect(x, y, barWidth, barHeight, 2);
      this.ctx.fill();
    }
  }

  drawWave(freqData, isPlaying) {
    this.ctx.beginPath();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "#e50914";

    const points = 40;
    const sliceWidth = this.width / (points - 1);
    this.idlePhase += 0.05;

    for (let i = 0; i < points; i++) {
      let amp = 0;
      if (isPlaying && freqData) {
        amp = (freqData[i % freqData.length] / 255 - 0.5) * (this.height * 0.75);
      } else {
        amp = Math.sin(this.idlePhase + i * 0.35) * (this.height * 0.12);
      }

      const x = i * sliceWidth;
      const y = this.height / 2 + amp;

      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
  }

  drawRadial(freqData, isPlaying) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(centerX, centerY) * 0.65;
    const count = 30;
    this.idlePhase += 0.03;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      let val = 0;
      if (isPlaying && freqData) {
        val = (freqData[i % freqData.length] / 255) * 14;
      } else {
        val = Math.sin(this.idlePhase + i * 0.35) * 3 + 2;
      }

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + val);
      const y2 = centerY + Math.sin(angle) * (radius + val);

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.strokeStyle = (i % 2 === 0) ? "#e50914" : "#ff334b";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  roundRect(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }
}
