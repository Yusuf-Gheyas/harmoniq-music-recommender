/**
 * HarmoniQ Synchronized Lyrics Engine
 * Features real-time karaoke tracking, interactive seeking, and auto-scrolling.
 */

class LyricsManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentLyrics = [];
    this.activeLineIndex = -1;
  }

  loadLyrics(track) {
    if (!this.container) return;
    this.activeLineIndex = -1;
    this.currentLyrics = track && track.lyrics ? track.lyrics : [];

    if (!this.currentLyrics.length) {
      this.container.innerHTML = `
        <div class="lyrics-empty">
          <span class="icon">✨</span>
          <p>Instrumental track or lyrics not yet submitted by artist.</p>
        </div>
      `;
      return;
    }

    this.render();
  }

  render() {
    this.container.innerHTML = this.currentLyrics
      .map(
        (line, index) => `
        <div class="lyric-line" data-index="${index}" data-time="${line.time}">
          ${line.text}
        </div>
      `
      )
      .join("");

    // Click on a line to seek
    const lines = this.container.querySelectorAll(".lyric-line");
    lines.forEach(el => {
      el.addEventListener("click", () => {
        const time = parseFloat(el.getAttribute("data-time"));
        if (!isNaN(time) && audio) {
          audio.seek(time);
        }
      });
    });
  }

  updateTime(currentTime) {
    if (!this.currentLyrics.length || !this.container) return;

    let newIndex = -1;
    for (let i = 0; i < this.currentLyrics.length; i++) {
      if (currentTime >= this.currentLyrics[i].time) {
        newIndex = i;
      } else {
        break;
      }
    }

    if (newIndex !== this.activeLineIndex) {
      this.activeLineIndex = newIndex;
      const lines = this.container.querySelectorAll(".lyric-line");
      lines.forEach((lineEl, idx) => {
        if (idx === this.activeLineIndex) {
          lineEl.classList.add("active");
          // Smooth scroll active line to center
          lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          lineEl.classList.remove("active");
        }
      });
    }
  }
}
