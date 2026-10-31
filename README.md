# HarmoniQ – AI-Powered Personalized Music Recommendation System 🎵

[![Web Audio API](https://img.shields.io/badge/Web%20Audio-API-blue?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Status](https://img.shields.io/badge/Release-v1.0-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-purple)]()

> **HarmoniQ** is a modern, responsive web application for intelligent music streaming, mood calibration, and content-based recommendation. Built with standard W3C Web Audio API, dynamic vector distance algorithms, and a real-time HTML5 Canvas visualizer.

---

## 🌟 Key Features

1. **Interactive Web Audio DSP Player**:
   - High-fidelity audio playback controls (Play/Pause, Next, Previous, Seek Scrubber, Volume, Repeat, and Shuffle).
2. **Real-time Canvas Spectrum Visualizer**:
   - 3 dynamic modes: **Neon Frequency Bars**, **Radial Pulsing Halo**, and **Fluid Waveform Oscilloscope**.
   - Smooth idle breathing animation when playback is paused.
3. **Multi-Dimension Content-Based Recommendation Engine**:
   - Maps audio tracks across 5 acoustic dimensions ($BPM$, $Energy$, $Valence$, $Danceability$, and $Acousticness$).
   - Calculates weighted Euclidean vector distance against user taste profiles.
4. **Transparent "Why this song?" Explainability Badges**:
   - Clear natural-language rationale explaining each algorithmic suggestion.
5. **Dynamic Vibe & Mood Matcher**:
   - Instant mood filters (`Chill`, `Focus`, `Hype`, `Melancholy`, `Dreamy`, `Energetic`, `Peaceful`).
   - Interactive live sliders for Target BPM, Energy, and Valence that re-rank tracks dynamically.
6. **AI Smart Mix Generator**:
   - 1-click generation of balanced 8-track playlists matching current mood parameters.
7. **Karaoke Synchronized Real-time Lyrics**:
   - Auto-scrolling and glowing synchronized lyrics with click-to-seek functionality.
8. **5-Band Graphic Equalizer**:
   - Hardware-grade `BiquadFilterNode` bands at 60Hz, 250Hz, 1kHz, 4kHz, and 12kHz with presets (*Flat*, *Bass Boost*, *Vocal Clarity*, *Treble Boost*, *Electronic*).
9. **Ambient Soundscape Mixer**:
   - Layer soothing Pink Noise (*Gentle Rain*), Brown Noise (*Cozy Café*), or White Noise (*Vinyl Crackle*) over any track for study and focus.
10. **Music DNA & Listening Analytics**:
    - Pure SVG Radar Chart (Acoustic Footprint) and Donut Chart (Genre Breakdown) rendered without external heavy dependencies.
    - Dynamic listening archetype badge (e.g., *Zen Lofi Monk*, *High-Voltage Cyberpunk*).
11. **Artist Studio Portal**:
    - Upload and publish original tracks with acoustic metadata, custom BPM, energy levels, and lyrics.
12. **Admin Control Center**:
    - Platform oversight with catalog metrics, user directory, and database management.
13. **Role-Based Access Control**:
    - Instant switching between **Listener**, **Artist**, and **Admin** personas.
14. **Persistent LocalStorage Architecture**:
    - All tracks, playlists, liked songs, and listening history persist across sessions.

---

## 👥 Engineering Team

- **Irshad Rouf** – Recommendation Engine & Algorithm Architecture
- **Yusuf Gheyas** – Web Audio API, Canvas Visualizer & UI/UX
- **Arsh Sharma** – Data Architecture, RBAC & Analytics Engine

---

## 🚀 Getting Started

HarmoniQ is built using standard client-side technologies with zero server dependencies:

1. Clone or download the repository:
   ```bash
   git clone https://github.com/<username>/harmoniq-music-recommender.git
   cd harmoniq-music-recommender
   ```
2. Double-click `index.html` or open it with any modern web browser (Chrome, Edge, Firefox, Safari).

---

## 🌐 Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In your repository, navigate to **Settings** → **Pages**.
3. Under **Branch**, select `main` and root `/`, then click **Save**.
4. The live application will be available at `https://<username>.github.io/harmoniq-music-recommender/`.

---

## ⌨️ Keyboard Shortcuts

- <kbd>Space</kbd>: Play / Pause
- <kbd>→</kbd> / <kbd>←</kbd>: Seek forward / backward 5 seconds
- <kbd>N</kbd> / <kbd>P</kbd>: Next / Previous track
- <kbd>L</kbd>: Toggle Like (Favorite)
- <kbd>M</kbd>: Mute / Unmute
- <kbd>Ctrl</kbd> + <kbd>K</kbd>: Focus Search Bar
