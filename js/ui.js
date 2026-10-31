/**
 * HarmoniQ UI Controller
 * Manages view switching, track rendering, modal dialogues,
 * role switcher, player state reflections, and event binding.
 */

class UIManager {
  constructor() {
    this.currentView = "discover";
    this.searchQuery = "";
    this.selectedGenre = "All";
    this.lyricsManager = null;
    this.visualizer = null;
    this.activeQueue = [];
    this.queueIndex = 0;
  }

  init() {
    this.lyricsManager = new LyricsManager("lyricsContent");
    this.visualizer = new AudioVisualizer("visualizerCanvas");

    this.bindNavigation();
    this.bindPlayerEvents();
    this.bindSearchAndFilters();
    this.bindRoleSwitcher();
    this.bindModals();
    this.bindVibeSliders();

    // Initial render
    this.updateUserBadge();
    this.renderCurrentView();

    // Default load first track in queue
    const allTracks = storage.getTracks();
    if (allTracks.length > 0) {
      this.activeQueue = [...allTracks];
      this.loadTrackIntoPlayer(allTracks[0], false);
    }
  }

  // --- NAVIGATION ---
  bindNavigation() {
    const navLinks = document.querySelectorAll(".nav-item");
    navLinks.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const view = link.getAttribute("data-view");
        if (view) {
          this.switchView(view);
        }
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-view") === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    document.querySelectorAll(".view-panel").forEach(panel => {
      panel.classList.remove("active");
    });

    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) {
      activePanel.classList.add("active");
    }

    this.renderCurrentView();
  }

  renderCurrentView() {
    switch (this.currentView) {
      case "discover":
        this.renderDiscover();
        break;
      case "vibe":
        this.renderVibeMatrix();
        break;
      case "playlists":
        this.renderPlaylists();
        break;
      case "analytics":
        this.renderAnalytics();
        break;
      case "artist":
        this.renderArtistStudio();
        break;
      case "admin":
        this.renderAdminDashboard();
        break;
      case "favorites":
        this.renderFavorites();
        break;
      default:
        this.renderDiscover();
    }
  }

  // --- ROLE SWITCHER ---
  bindRoleSwitcher() {
    const selector = document.getElementById("roleSelect");
    if (!selector) return;

    selector.addEventListener("change", e => {
      const selectedId = e.target.value;
      storage.setCurrentUser(selectedId);
      const user = storage.getCurrentUser();
      this.showToast(`Switched profile to ${user.name} (${user.role.toUpperCase()})`);
      this.updateUserBadge();
      this.renderCurrentView();
    });
  }

  updateUserBadge() {
    const user = storage.getCurrentUser();
    const selector = document.getElementById("roleSelect");
    if (selector) selector.value = user.id;

    const nameEl = document.getElementById("currentUserName");
    const roleEl = document.getElementById("currentUserRole");
    const avatarEl = document.getElementById("currentUserAvatar");

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role.toUpperCase();
    if (avatarEl) avatarEl.textContent = user.avatar || "👤";

    // Conditional visibility of role navigation tabs
    const artistTab = document.querySelector('[data-view="artist"]');
    const adminTab = document.querySelector('[data-view="admin"]');

    if (artistTab) {
      artistTab.style.display = (user.role === "artist" || user.role === "admin") ? "flex" : "none";
    }
    if (adminTab) {
      adminTab.style.display = user.role === "admin" ? "flex" : "none";
    }
  }

  // --- SEARCH & FILTERS ---
  bindSearchAndFilters() {
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderCurrentView();
      });
    }

    const genrePills = document.querySelectorAll(".genre-pill");
    genrePills.forEach(pill => {
      pill.addEventListener("click", () => {
        genrePills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.selectedGenre = pill.getAttribute("data-genre");
        this.renderDiscover();
      });
    });
  }

  // --- VIEW RENDERING ---
  renderDiscover() {
    const user = storage.getCurrentUser();
    const allTracks = storage.getTracks();

    // 1. Filtered tracks for generic browse
    let filtered = allTracks;
    if (this.selectedGenre && this.selectedGenre !== "All") {
      filtered = filtered.filter(t => t.genre === this.selectedGenre);
    }
    if (this.searchQuery) {
      filtered = filtered.filter(
        t =>
          t.title.toLowerCase().includes(this.searchQuery) ||
          t.artist.toLowerCase().includes(this.searchQuery) ||
          t.album.toLowerCase().includes(this.searchQuery) ||
          t.genre.toLowerCase().includes(this.searchQuery) ||
          t.mood.toLowerCase().includes(this.searchQuery)
      );
    }

    // 2. Personalized "For You" Recommendations
    const recs = recommender.getRecommendationsForUser(user, allTracks, 6);

    const recContainer = document.getElementById("forYouTrackList");
    if (recContainer) {
      recContainer.innerHTML = recs.map(t => this.generateTrackCardHTML(t, true)).join("");
      this.attachTrackCardEvents(recContainer);
    }

    // 3. Trending / All catalog
    const catalogContainer = document.getElementById("trendingTrackList");
    if (catalogContainer) {
      if (filtered.length === 0) {
        catalogContainer.innerHTML = `<div class="empty-state"><p>No tracks matched your search query "${this.searchQuery}".</p></div>`;
      } else {
        catalogContainer.innerHTML = filtered.map(t => this.generateTrackCardHTML(t, false)).join("");
        this.attachTrackCardEvents(catalogContainer);
      }
    }
  }

  renderVibeMatrix() {
    const allTracks = storage.getTracks();
    const moodPills = document.querySelectorAll(".mood-pill");
    let activeMood = "Chill";
    moodPills.forEach(pill => {
      if (pill.classList.contains("active")) activeMood = pill.getAttribute("data-mood");
    });

    const bpmVal = parseInt(document.getElementById("sliderBpm")?.value || 90);
    const energyVal = parseFloat(document.getElementById("sliderEnergy")?.value || 0.5);
    const valenceVal = parseFloat(document.getElementById("sliderValence")?.value || 0.5);

    const vibeTracks = recommender.getVibeRecommendations(allTracks, {
      mood: activeMood,
      targetBpm: bpmVal,
      targetEnergy: energyVal,
      targetValence: valenceVal
    }, 8);

    const container = document.getElementById("vibeTrackList");
    if (container) {
      container.innerHTML = vibeTracks.map(t => this.generateTrackCardHTML(t, true)).join("");
      this.attachTrackCardEvents(container);
    }
  }

  bindVibeSliders() {
    const moodPills = document.querySelectorAll(".mood-pill");
    moodPills.forEach(pill => {
      pill.addEventListener("click", () => {
        moodPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.renderVibeMatrix();
      });
    });

    ["sliderBpm", "sliderEnergy", "sliderValence"].forEach(id => {
      const slider = document.getElementById(id);
      const label = document.getElementById(`${id}Val`);
      if (slider) {
        slider.addEventListener("input", e => {
          if (label) {
            if (id === "sliderBpm") label.textContent = `${e.target.value} BPM`;
            else label.textContent = `${Math.round(e.target.value * 100)}%`;
          }
          this.renderVibeMatrix();
        });
      }
    });

    // Auto-Mix Generation Button
    const autoMixBtn = document.getElementById("btnGenerateMix");
    if (autoMixBtn) {
      autoMixBtn.addEventListener("click", () => {
        const tracks = storage.getTracks();
        const mix = recommender.generateSmartMix(tracks, "All", "All", 8);
        const pl = storage.createPlaylist(`AI Smart Mix (${new Date().toLocaleDateString()})`, "Generated automatically by HarmoniQ AI", mix.map(t => t.id));
        this.showToast(`✨ Generated 8-track smart playlist: "${pl.title}"!`);
        this.switchView("playlists");
      });
    }
  }

  renderPlaylists() {
    const playlists = storage.getPlaylists();
    const tracks = storage.getTracks();
    const trackMap = new Map(tracks.map(t => [t.id, t]));
    const container = document.getElementById("playlistsGrid");

    if (!container) return;

    if (!playlists.length) {
      container.innerHTML = `<p class="muted-text">No playlists yet. Create your first one!</p>`;
      return;
    }

    container.innerHTML = playlists
      .map(
        pl => `
      <div class="playlist-card" data-id="${pl.id}">
        <div class="playlist-cover" style="background: ${pl.coverGradient}">
          <span class="cover-icon">🎶</span>
          <button class="btn-play-playlist" data-id="${pl.id}" title="Play Playlist">▶</button>
        </div>
        <div class="playlist-meta">
          <h3>${pl.title}</h3>
          <p class="playlist-desc">${pl.description}</p>
          <div class="playlist-footer">
            <span>${pl.trackIds.length} tracks • by ${pl.creatorName}</span>
            <button class="btn-delete-pl" data-id="${pl.id}" title="Delete Playlist">🗑️</button>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // Bind playlist card plays
    container.querySelectorAll(".btn-play-playlist").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const plId = btn.getAttribute("data-id");
        const pl = playlists.find(p => p.id === plId);
        if (pl && pl.trackIds.length > 0) {
          const plTracks = pl.trackIds.map(id => trackMap.get(id)).filter(Boolean);
          if (plTracks.length > 0) {
            this.activeQueue = plTracks;
            this.queueIndex = 0;
            this.loadTrackIntoPlayer(plTracks[0], true);
            this.showToast(`Playing playlist "${pl.title}" (${plTracks.length} tracks)`);
          }
        } else {
          this.showToast("This playlist is currently empty.");
        }
      });
    });

    container.querySelectorAll(".btn-delete-pl").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const plId = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this playlist?")) {
          storage.deletePlaylist(plId);
          this.renderPlaylists();
          this.showToast("Playlist deleted.");
        }
      });
    });
  }

  renderFavorites() {
    const user = storage.getCurrentUser();
    const allTracks = storage.getTracks();
    const liked = allTracks.filter(t => user.likedTracks && user.likedTracks.includes(t.id));
    const container = document.getElementById("favoritesTrackList");

    if (!container) return;

    if (!liked.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="icon">💔</span>
          <h3>No Liked Songs Yet</h3>
          <p>Tap the heart icon on any song to save it to your favorites.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = liked.map(t => this.generateTrackCardHTML(t, false)).join("");
    this.attachTrackCardEvents(container);
  }

  renderAnalytics() {
    const user = storage.getCurrentUser();
    const tracks = storage.getTracks();
    const stats = analytics.getUserStats(user, tracks);

    // Update KPI badges
    const statPlays = document.getElementById("statHistoryCount");
    const statLiked = document.getElementById("statLikedCount");
    const statMinutes = document.getElementById("statMinutes");

    if (statPlays) statPlays.textContent = stats.historyCount;
    if (statLiked) statLiked.textContent = stats.likedCount;
    if (statMinutes) statMinutes.textContent = `${stats.estimatedMinutes}m`;

    // Render Archetype
    const archIcon = document.getElementById("archetypeIcon");
    const archTitle = document.getElementById("archetypeTitle");
    const archDesc = document.getElementById("archetypeDesc");

    if (archIcon) archIcon.textContent = stats.archetype.icon;
    if (archTitle) archTitle.textContent = stats.archetype.title;
    if (archDesc) archDesc.textContent = stats.archetype.description;

    // Render Charts
    analytics.renderRadarChart("radarChartContainer", stats.tasteVector);
    analytics.renderGenreDonut("donutChartContainer", stats.genreCounts);
  }

  renderArtistStudio() {
    const user = storage.getCurrentUser();
    const tracks = storage.getTracks();
    const container = document.getElementById("artistTrackTable");
    if (!container) return;

    const myTracks = tracks.filter(t => t.uploadedBy === user.name || user.role === "admin" || t.artist.includes(user.name.split(" ")[0]));
    const displayTracks = myTracks.length ? myTracks : tracks.slice(0, 6);

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Track</th>
            <th>Genre</th>
            <th>Tempo</th>
            <th>Streams</th>
            <th>Likes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${displayTracks
            .map(
              t => `
            <tr>
              <td>
                <div class="table-track-cell">
                  <div class="mini-cover" style="background: ${t.coverGradient}">${t.coverIcon}</div>
                  <div>
                    <strong>${t.title}</strong>
                    <div class="muted-text">${t.album}</div>
                  </div>
                </div>
              </td>
              <td><span class="badge">${t.genre}</span></td>
              <td>${t.bpm} BPM</td>
              <td>${t.plays.toLocaleString()}</td>
              <td>❤️ ${t.likes}</td>
              <td>
                <button class="btn-sm btn-play-row" data-id="${t.id}">▶</button>
                <button class="btn-sm btn-del-row" data-id="${t.id}">🗑️</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    container.querySelectorAll(".btn-play-row").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const t = storage.getTrack(id);
        if (t) this.loadTrackIntoPlayer(t, true);
      });
    });

    container.querySelectorAll(".btn-del-row").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this track?")) {
          storage.deleteTrack(id);
          this.renderArtistStudio();
          this.showToast("Track deleted from library.");
        }
      });
    });
  }

  renderAdminDashboard() {
    const tracks = storage.getTracks();
    const users = storage.getUsers();
    const playlists = storage.getPlaylists();

    const totalPlays = tracks.reduce((sum, t) => sum + (t.plays || 0), 0);
    const totalLikes = tracks.reduce((sum, t) => sum + (t.likes || 0), 0);

    const kpiUsers = document.getElementById("kpiTotalUsers");
    const kpiTracks = document.getElementById("kpiTotalTracks");
    const kpiPlays = document.getElementById("kpiTotalPlays");
    const kpiPlaylists = document.getElementById("kpiTotalPlaylists");

    if (kpiUsers) kpiUsers.textContent = users.length;
    if (kpiTracks) kpiTracks.textContent = tracks.length;
    if (kpiPlays) kpiPlays.textContent = totalPlays.toLocaleString();
    if (kpiPlaylists) kpiPlaylists.textContent = playlists.length;

    const userTable = document.getElementById("adminUserTable");
    if (userTable) {
      userTable.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Email</th>
              <th>Liked Tracks</th>
              <th>Top Genres</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                u => `
              <tr>
                <td><strong>${u.avatar} ${u.name}</strong></td>
                <td><span class="role-badge role-${u.role}">${u.role.toUpperCase()}</span></td>
                <td>${u.email}</td>
                <td>${u.likedTracks?.length || 0}</td>
                <td>${u.preferences?.favoriteGenres?.join(", ") || "General"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }
  }

  // --- HTML GENERATORS ---
  generateTrackCardHTML(track, showReason = false) {
    const isLiked = storage.isTrackLiked(track.id);
    const matchBadge = track.matchScore ? `<span class="match-badge">🎯 ${track.matchScore}% Match</span>` : "";
    const reasonHTML = showReason && track.recommendationReason
      ? `<div class="rec-reason"><span class="bulb">💡</span> ${track.recommendationReason}</div>`
      : "";

    return `
      <div class="track-card" data-id="${track.id}">
        <div class="track-cover" style="background: ${track.coverGradient}">
          <span class="cover-icon">${track.coverIcon}</span>
          <button class="btn-card-play" data-id="${track.id}" title="Play Track">▶</button>
          ${matchBadge}
        </div>
        <div class="track-info">
          <h4 class="track-title" title="${track.title}">${track.title}</h4>
          <p class="track-artist">${track.artist}</p>
          <div class="track-tags">
            <span class="tag">${track.genre}</span>
            <span class="tag">${track.bpm} BPM</span>
            <span class="tag">${track.mood}</span>
          </div>
          ${reasonHTML}
          <div class="track-actions">
            <button class="btn-like ${isLiked ? "active" : ""}" data-id="${track.id}" title="Like">
              ${isLiked ? "❤️" : "🤍"}
            </button>
            <button class="btn-add-to-pl" data-id="${track.id}" title="Add to Playlist">➕</button>
          </div>
        </div>
      </div>
    `;
  }

  attachTrackCardEvents(container) {
    container.querySelectorAll(".btn-card-play").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const track = storage.getTrack(id);
        if (track) {
          this.loadTrackIntoPlayer(track, true);
        }
      });
    });

    container.querySelectorAll(".btn-like").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const liked = storage.toggleLike(id);
        btn.innerHTML = liked ? "❤️" : "🤍";
        btn.classList.toggle("active", liked);
        this.showToast(liked ? "Added to Liked Songs" : "Removed from Liked Songs");
        if (this.currentView === "favorites" || this.currentView === "analytics") {
          this.renderCurrentView();
        }
      });
    });

    container.querySelectorAll(".btn-add-to-pl").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const trackId = btn.getAttribute("data-id");
        this.openAddToPlaylistModal(trackId);
      });
    });

    container.querySelectorAll(".track-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const track = storage.getTrack(id);
        if (track) this.loadTrackIntoPlayer(track, true);
      });
    });
  }

  // --- PLAYER CONTROLS & EVENTS ---
  loadTrackIntoPlayer(track, autoPlay = true) {
    if (!track) return;
    audio.loadTrack(track, autoPlay);
    storage.incrementPlays(track.id);

    // Update bottom docked bar
    const titleEl = document.getElementById("playerTitle");
    const artistEl = document.getElementById("playerArtist");
    const coverEl = document.getElementById("playerCover");
    const likeBtn = document.getElementById("playerLikeBtn");

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = `${track.artist} • ${track.album}`;
    if (coverEl) {
      coverEl.style.background = track.coverGradient;
      coverEl.textContent = track.coverIcon;
    }
    if (likeBtn) {
      const isLiked = storage.isTrackLiked(track.id);
      likeBtn.innerHTML = isLiked ? "❤️" : "🤍";
      likeBtn.classList.toggle("active", isLiked);
    }

    // Load lyrics
    if (this.lyricsManager) {
      this.lyricsManager.loadLyrics(track);
    }
  }

  bindPlayerEvents() {
    const playBtn = document.getElementById("btnPlayPause");
    const prevBtn = document.getElementById("btnPrevTrack");
    const nextBtn = document.getElementById("btnNextTrack");
    const seekSlider = document.getElementById("playerSeek");
    const volumeSlider = document.getElementById("playerVolume");
    const muteBtn = document.getElementById("btnMute");
    const likeBtn = document.getElementById("playerLikeBtn");

    if (playBtn) {
      playBtn.addEventListener("click", () => audio.togglePlay());
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.playPrevious());
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.playNext());
    }

    if (seekSlider) {
      seekSlider.addEventListener("input", e => {
        audio.seek(parseFloat(e.target.value));
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener("input", e => {
        audio.setVolume(parseFloat(e.target.value));
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        if (audio.volume > 0) {
          audio.setVolume(0);
          if (volumeSlider) volumeSlider.value = 0;
          muteBtn.textContent = "🔇";
        } else {
          audio.setVolume(0.75);
          if (volumeSlider) volumeSlider.value = 0.75;
          muteBtn.textContent = "🔊";
        }
      });
    }

    if (likeBtn) {
      likeBtn.addEventListener("click", () => {
        if (!audio.currentTrack) return;
        const liked = storage.toggleLike(audio.currentTrack.id);
        likeBtn.innerHTML = liked ? "❤️" : "🤍";
        likeBtn.classList.toggle("active", liked);
        this.showToast(liked ? "Added to Liked Songs" : "Removed from Liked Songs");
        this.renderCurrentView();
      });
    }

    // Audio engine state listener
    audio.onStateChangeCallback = ({ isPlaying, track }) => {
      if (playBtn) {
        playBtn.innerHTML = isPlaying ? "⏸" : "▶";
      }
    };

    // Time update listener
    audio.onTimeUpdateCallback = (current, duration) => {
      const curTimeEl = document.getElementById("playerCurrentTime");
      const durTimeEl = document.getElementById("playerDurationTime");

      if (curTimeEl) curTimeEl.textContent = this.formatTime(current);
      if (durTimeEl) durTimeEl.textContent = this.formatTime(duration);

      if (seekSlider && !seekSlider.matches(":active")) {
        seekSlider.max = duration || 100;
        seekSlider.value = current;
      }

      if (this.lyricsManager) {
        this.lyricsManager.updateTime(current);
      }
    };

    // Auto next track
    audio.onEndedCallback = () => {
      this.playNext();
    };

    // Visualizer Mode Buttons
    document.querySelectorAll(".vis-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".vis-mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const mode = btn.getAttribute("data-mode");
        if (this.visualizer) this.visualizer.setMode(mode);
      });
    });
  }

  playNext() {
    if (!this.activeQueue.length) {
      this.activeQueue = storage.getTracks();
    }
    this.queueIndex = (this.queueIndex + 1) % this.activeQueue.length;
    this.loadTrackIntoPlayer(this.activeQueue[this.queueIndex], true);
  }

  playPrevious() {
    if (!this.activeQueue.length) {
      this.activeQueue = storage.getTracks();
    }
    this.queueIndex = (this.queueIndex - 1 + this.activeQueue.length) % this.activeQueue.length;
    this.loadTrackIntoPlayer(this.activeQueue[this.queueIndex], true);
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // --- MODALS (Equalizer, Ambient, Lyrics, Upload, AddToPlaylist) ---
  bindModals() {
    // Lyrics toggle
    const toggleLyricsBtn = document.getElementById("btnToggleLyrics");
    const lyricsModal = document.getElementById("lyricsModal");
    if (toggleLyricsBtn && lyricsModal) {
      toggleLyricsBtn.addEventListener("click", () => {
        lyricsModal.classList.toggle("active");
      });
    }

    // Equalizer Modal
    const btnEq = document.getElementById("btnToggleEq");
    const eqModal = document.getElementById("eqModal");
    if (btnEq && eqModal) {
      btnEq.addEventListener("click", () => {
        eqModal.classList.toggle("active");
      });
    }

    // EQ Presets
    document.querySelectorAll(".eq-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".eq-preset-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const preset = btn.getAttribute("data-preset");
        const gains = audio.applyEqPreset(preset);
        gains.forEach((g, idx) => {
          const slider = document.getElementById(`eqBand${idx}`);
          if (slider) slider.value = g;
        });
        this.showToast(`Equalizer: ${preset.replace("_", " ").toUpperCase()}`);
      });
    });

    // Custom EQ sliders
    [0, 1, 2, 3, 4].forEach(idx => {
      const slider = document.getElementById(`eqBand${idx}`);
      if (slider) {
        slider.addEventListener("input", () => {
          const gains = [0, 1, 2, 3, 4].map(i => parseFloat(document.getElementById(`eqBand${i}`)?.value || 0));
          audio.setEqualizerGains(gains);
        });
      }
    });

    // Ambient Modal
    const btnAmbient = document.getElementById("btnToggleAmbient");
    const ambientModal = document.getElementById("ambientModal");
    if (btnAmbient && ambientModal) {
      btnAmbient.addEventListener("click", () => {
        ambientModal.classList.toggle("active");
      });
    }

    // Ambient Sound Selection
    document.querySelectorAll(".ambient-card").forEach(card => {
      card.addEventListener("click", () => {
        const preset = card.getAttribute("data-preset");
        const isActive = card.classList.contains("active");

        document.querySelectorAll(".ambient-card").forEach(c => c.classList.remove("active"));

        if (!isActive) {
          card.classList.add("active");
          const vol = parseFloat(document.getElementById("ambientVolumeSlider")?.value || 0.25);
          audio.setAmbientSound(preset, vol);
          this.showToast(`Ambient Soundscape: ${preset.toUpperCase()} active`);
        } else {
          audio.setAmbientSound(null);
          this.showToast("Ambient soundscape turned off.");
        }
      });
    });

    const ambientVolSlider = document.getElementById("ambientVolumeSlider");
    if (ambientVolSlider) {
      ambientVolSlider.addEventListener("input", e => {
        audio.setAmbientVolume(parseFloat(e.target.value));
      });
    }

    // Upload Song Form (Artist Studio)
    const uploadForm = document.getElementById("uploadTrackForm");
    if (uploadForm) {
      uploadForm.addEventListener("submit", e => {
        e.preventDefault();
        const user = storage.getCurrentUser();
        const trackData = {
          title: document.getElementById("upTitle").value,
          artist: document.getElementById("upArtist").value || user.name,
          album: document.getElementById("upAlbum").value || "Independent Release",
          genre: document.getElementById("upGenre").value,
          mood: document.getElementById("upMood").value,
          bpm: parseInt(document.getElementById("upBpm").value) || 90,
          energy: parseFloat(document.getElementById("upEnergy").value) || 0.5,
          synthType: document.getElementById("upSynth").value,
          coverIcon: document.getElementById("upIcon").value || "🎵",
          audioUrl: document.getElementById("upAudioUrl").value || "",
          lyrics: [
            { time: 5, text: document.getElementById("upLyrics").value || "HarmoniQ Original Melody" }
          ]
        };

        const newTrack = storage.addTrack(trackData);
        this.showToast(`🎉 "${newTrack.title}" published to library!`);
        uploadForm.reset();
        this.renderArtistStudio();
        this.renderDiscover();
      });
    }

    // Create Playlist Modal
    const btnNewPlaylist = document.getElementById("btnCreatePlaylist");
    const plModal = document.getElementById("newPlaylistModal");
    const plForm = document.getElementById("newPlaylistForm");

    if (btnNewPlaylist && plModal) {
      btnNewPlaylist.addEventListener("click", () => plModal.classList.add("active"));
    }

    if (plForm) {
      plForm.addEventListener("submit", e => {
        e.preventDefault();
        const title = document.getElementById("plTitleInput").value;
        const desc = document.getElementById("plDescInput").value;
        storage.createPlaylist(title, desc);
        plModal.classList.remove("active");
        plForm.reset();
        this.showToast(`Playlist "${title}" created!`);
        this.renderPlaylists();
      });
    }

    // Close buttons on all modals
    document.querySelectorAll(".btn-close-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
      });
    });

    // Close modal when clicking outside
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", e => {
        if (e.target === overlay) {
          overlay.classList.remove("active");
        }
      });
    });

    // Reset System Data (Admin action)
    const btnResetData = document.getElementById("btnResetSystemData");
    if (btnResetData) {
      btnResetData.addEventListener("click", () => {
        if (confirm("Reset system database to initial seed data? This resets all changes.")) {
          storage.resetAll();
          this.showToast("Database reset to factory state.");
          window.location.reload();
        }
      });
    }
  }

  openAddToPlaylistModal(trackId) {
    const playlists = storage.getPlaylists();
    const modal = document.getElementById("addToPlaylistModal");
    const listContainer = document.getElementById("playlistSelectList");

    if (!modal || !listContainer) return;

    if (!playlists.length) {
      listContainer.innerHTML = `<p class="muted-text">No playlists yet. Create one in the Playlists tab.</p>`;
    } else {
      listContainer.innerHTML = playlists
        .map(
          pl => `
        <div class="playlist-select-item" data-plid="${pl.id}">
          <div class="mini-cover" style="background: ${pl.coverGradient}">🎶</div>
          <div>
            <strong>${pl.title}</strong>
            <div class="muted-text">${pl.trackIds.length} tracks</div>
          </div>
          <button class="btn-sm btn-select-add">Add</button>
        </div>
      `
        )
        .join("");

      listContainer.querySelectorAll(".playlist-select-item").forEach(item => {
        item.addEventListener("click", () => {
          const plId = item.getAttribute("data-plid");
          const success = storage.addTrackToPlaylist(plId, trackId);
          modal.classList.remove("active");
          this.showToast(success ? "Track added to playlist!" : "Track is already in this playlist.");
        });
      });
    }

    modal.classList.add("active");
  }

  showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

const ui = new UIManager();
