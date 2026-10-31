/**
 * HarmoniQ Analytics & Taste Profiling Engine
 * Generates dynamic SVG charts:
 * 1. Acoustic DNA Radar Chart (Energy, Valence, Danceability, Acousticness, Tempo)
 * 2. Genre Affinity Donut Chart
 * 3. Listening Archetype & Year-in-Review Wrapped Card
 */

class AnalyticsManager {
  constructor() {}

  /**
   * Computes user listening statistics from history and liked tracks
   */
  getUserStats(user, tracks) {
    const history = user.history || [];
    const liked = user.likedTracks || [];

    // Genre count
    const genreCounts = {};
    const trackMap = new Map(tracks.map(t => [t.id, t]));

    let totalDuration = 0;
    history.forEach(item => {
      const track = trackMap.get(item.trackId);
      if (track) {
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
        totalDuration += track.duration || 180;
      }
    });

    // Also factor in liked tracks
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
      estimatedMinutes: Math.round(totalDuration / 60) + (liked.length * 4),
      genreCounts,
      tasteVector,
      archetype
    };
  }

  determineArchetype(vector) {
    if (vector.energy > 0.75 && vector.bpm > 120) {
      return {
        title: "High-Voltage Cyberpunk",
        icon: "⚡",
        description: "Your sonic pulse runs on heavy synths, driving rhythms, and unstoppable kinetic energy."
      };
    }
    if (vector.acousticness > 0.75 && vector.energy < 0.4) {
      return {
        title: "Zen Lofi Monk",
        icon: "🧘‍♂️",
        description: "You seek peaceful acoustic spaces, vintage warmth, and calm frequencies for deep thought."
      };
    }
    if (vector.valence > 0.7 && vector.danceability > 0.7) {
      return {
        title: "Euphoric Groove Machine",
        icon: "🪩",
        description: "Your music radiates vibrant optimism, high spirits, and irresistible dance grooves."
      };
    }
    if (vector.genres.includes("Ambient") || vector.genres.includes("Focus")) {
      return {
        title: "Deep Work Scholar",
        icon: "📚",
        description: "You masterfully tune out distraction with neural ambient drones and gentle study beats."
      };
    }
    return {
      title: "Eclectic Sonic Explorer",
      icon: "🌌",
      description: "You wander effortlessly across genres, chasing exceptional melodies wherever they live."
    };
  }

  /**
   * Generates interactive SVG Radar Chart for Acoustic Dimensions
   */
  renderRadarChart(containerId, vector) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const size = 260;
    const center = size / 2;
    const radius = 95;
    const labels = ["Energy", "Valence", "Dance", "Acoustic", "Tempo"];
    const values = [
      vector.energy || 0.5,
      vector.valence || 0.5,
      0.65, // danceability
      vector.acousticness || 0.5,
      recommender.normalizeBpm(vector.bpm || 85)
    ];

    const angleStep = (Math.PI * 2) / labels.length;

    // Background concentric polygon webs
    let websSvg = "";
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      let points = [];
      for (let i = 0; i < labels.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + Math.cos(angle) * (radius * level);
        const y = center + Math.sin(angle) * (radius * level);
        points.push(`${x},${y}`);
      }
      websSvg += `<polygon points="${points.join(" ")}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />`;
    });

    // Axis lines and labels
    let axesSvg = "";
    let labelsSvg = "";
    for (let i = 0; i < labels.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      axesSvg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />`;

      const lx = center + Math.cos(angle) * (radius + 20);
      const ly = center + Math.sin(angle) * (radius + 20);
      labelsSvg += `<text x="${lx}" y="${ly + 4}" fill="#a0aec0" font-size="11" text-anchor="middle" font-family="system-ui">${labels[i]}</text>`;
    }

    // Data polygon
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
            <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#f857a6" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        ${websSvg}
        ${axesSvg}
        <polygon points="${dataPoints.join(" ")}" fill="url(#radarGrad)" stroke="#00f2fe" stroke-width="2.5" />
        ${labelsSvg}
      </svg>
    `;

    container.innerHTML = svg;
  }

  /**
   * Generates SVG Donut Chart for Genre Distribution
   */
  renderGenreDonut(containerId, genreCounts) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const genres = Object.keys(genreCounts);
    if (!genres.length) {
      container.innerHTML = `<p class="muted-text">Play more songs to generate your genre breakdown.</p>`;
      return;
    }

    const total = Object.values(genreCounts).reduce((a, b) => a + b, 0);
    const colors = ["#00f2fe", "#9b51e0", "#f857a6", "#ffb300", "#00F260", "#4FACFE"];

    let currentAngle = 0;
    const radius = 55;
    const strokeWidth = 22;
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
        <circle cx="80" cy="80" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
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
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${strokeWidth}" />
          ${slices}
          <text x="80" y="85" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">Genres</text>
        </svg>
        <div class="donut-legend">${legendItems}</div>
      </div>
    `;

    container.innerHTML = svg;
  }
}

const analytics = new AnalyticsManager();
