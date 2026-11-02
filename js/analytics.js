/**
 * HarmoniQ Analytics – Minimalist Red & Black Edition
 * Generates dynamic SVG charts:
 * 1. Acoustic DNA Radar Chart
 * 2. Genre Affinity Donut Chart
 * 3. Listening Archetype & Wrapped Card
 */

class AnalyticsManager {
  constructor() {}

  getUserStats(user, tracks) {
    const history = user.history || [];
    const liked = user.likedTracks || [];
    const genreCounts = {};
    const trackMap = new Map(tracks.map(t => [t.id, t]));

    let totalDuration = 0;
    history.forEach(item => {
      const track = trackMap.get(item.trackId);
      if (track) {
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
        totalDuration += track.duration || 30;
      }
    });

    liked.forEach(trackId => {
      const track = trackMap.get(trackId);
      if (track) {
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 2;
      }
    });

    const tasteVector = recommender.getUserTasteVector(user, tracks);
    const archetype = this.determineArchetype(tasteVector);

    return {
      historyCount: history.length,
      likedCount: liked.length,
      estimatedMinutes: Math.round(totalDuration / 60) + (liked.length * 3),
      genreCounts,
      tasteVector,
      archetype
    };
  }

  determineArchetype(vector) {
    if (vector.energy > 0.75 && vector.bpm > 125) {
      return {
        title: "High-Voltage Pulse",
        icon: "⚡",
        description: "Your taste runs on driving beats, high BPM synthwave, and relentless energy."
      };
    }
    if (vector.acousticness > 0.6 && vector.energy < 0.5) {
      return {
        title: "Acoustic Minimalist",
        icon: "🕯️",
        description: "You gravitate toward delicate vocal production, quiet spaces, and warm strings."
      };
    }
    if (vector.valence > 0.7 && vector.danceability > 0.7) {
      return {
        title: "Euphoric Groover",
        icon: "🪩",
        description: "Your library is filled with irresistible hooks, pop anthems, and vibrant rhythms."
      };
    }
    return {
      title: "Eclectic Connoisseur",
      icon: "🎧",
      description: "You navigate effortlessly across pop, hip-hop, indie, and electronic anthems."
    };
  }

  renderRadarChart(containerId, vector) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const size = 240;
    const center = size / 2;
    const radius = 85;
    const labels = ["Energy", "Valence", "Dance", "Acoustic", "Tempo"];
    const values = [
      vector.energy || 0.6,
      vector.valence || 0.6,
      0.75,
      vector.acousticness || 0.3,
      recommender.normalizeBpm(vector.bpm || 120)
    ];

    const angleStep = (Math.PI * 2) / labels.length;

    let websSvg = "";
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      let points = [];
      for (let i = 0; i < labels.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + Math.cos(angle) * (radius * level);
        const y = center + Math.sin(angle) * (radius * level);
        points.push(`${x},${y}`);
      }
      websSvg += `<polygon points="${points.join(" ")}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />`;
    });

    let axesSvg = "";
    let labelsSvg = "";
    for (let i = 0; i < labels.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      axesSvg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />`;

      const lx = center + Math.cos(angle) * (radius + 18);
      const ly = center + Math.sin(angle) * (radius + 18);
      labelsSvg += `<text x="${lx}" y="${ly + 4}" fill="#888888" font-size="10.5" font-weight="600" text-anchor="middle">${labels[i]}</text>`;
    }

    let dataPoints = [];
    for (let i = 0; i < values.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const val = Math.max(0.1, Math.min(1, values[i]));
      const x = center + Math.cos(angle) * (radius * val);
      const y = center + Math.sin(angle) * (radius * val);
      dataPoints.push(`${x},${y}`);
    }

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size}" class="radar-svg">
        <defs>
          <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e50914" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#990000" stop-opacity="0.2"/>
          </linearGradient>
        </defs>
        ${websSvg}
        ${axesSvg}
        <polygon points="${dataPoints.join(" ")}" fill="url(#radarGrad)" stroke="#e50914" stroke-width="2" />
        ${labelsSvg}
      </svg>
    `;

    container.innerHTML = svg;
  }

  renderGenreDonut(containerId, genreCounts) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const genres = Object.keys(genreCounts);
    if (!genres.length) {
      container.innerHTML = `<p class="muted-text">Play more songs to generate your genre breakdown.</p>`;
      return;
    }

    const total = Object.values(genreCounts).reduce((a, b) => a + b, 0);
    const colors = ["#e50914", "#ff334b", "#b20710", "#ffffff", "#777777", "#ff6b81"];

    let currentAngle = 0;
    const radius = 50;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;

    let slices = "";
    let legendItems = "";

    genres.slice(0, 5).forEach((genre, idx) => {
      const count = genreCounts[genre];
      const percent = count / total;
      const strokeDash = `${percent * circumference} ${circumference}`;
      const strokeOffset = -currentAngle * circumference;
      const color = colors[idx % colors.length];

      slices += `
        <circle cx="70" cy="70" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
          stroke-dasharray="${strokeDash}" stroke-dashoffset="${strokeOffset}" stroke-linecap="round" />
      `;

      legendItems += `
        <div class="legend-item">
          <span class="legend-dot" style="background: ${color}"></span>
          <span class="legend-label">${genre}</span>
          <span class="legend-percent">${Math.round(percent * 100)}%</span>
        </div>
      `;

      currentAngle += percent;
    });

    const svg = `
      <div class="donut-wrapper">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${strokeWidth}" />
          ${slices}
          <text x="70" y="74" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="700">Top Genres</text>
        </svg>
        <div class="donut-legend">${legendItems}</div>
      </div>
    `;

    container.innerHTML = svg;
  }
}

const analytics = new AnalyticsManager();
