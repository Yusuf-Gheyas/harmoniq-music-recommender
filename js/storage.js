/**
 * HarmoniQ Storage Manager
 * Persistent state management using LocalStorage with fallback support,
 * automated migration, and sample data seeding.
 */

const STORAGE_KEYS = {
  TRACKS: "harmoniq_tracks",
  USERS: "harmoniq_users",
  CURRENT_USER_ID: "harmoniq_current_user_id",
  PLAYLISTS: "harmoniq_playlists",
  SETTINGS: "harmoniq_settings"
};

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.TRACKS)) {
      localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(SEED_TRACKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, "user_yusuf");
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAYLISTS)) {
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(SEED_PLAYLISTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      const defaultSettings = {
        theme: "dark",
        volume: 0.75,
        eqPreset: "flat",
        eqGains: [0, 0, 0, 0, 0],
        ambientPreset: null,
        ambientVolume: 0.25,
        repeatMode: "all", // "off", "all", "one"
        shuffle: false
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
  }

  // --- TRACKS ---
  getTracks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRACKS)) || SEED_TRACKS;
    } catch (e) {
      return SEED_TRACKS;
    }
  }

  getTrack(id) {
    const tracks = this.getTracks();
    return tracks.find(t => t.id === id) || null;
  }

  saveTracks(tracks) {
    localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(tracks));
  }

  addTrack(trackData) {
    const tracks = this.getTracks();
    const newTrack = {
      id: "track_" + Date.now(),
      title: trackData.title || "Untitled Track",
      artist: trackData.artist || "Independent Artist",
      album: trackData.album || "Single",
      genre: trackData.genre || "Lofi",
      mood: trackData.mood || "Chill",
      bpm: parseInt(trackData.bpm) || 90,
      energy: parseFloat(trackData.energy) || 0.5,
      valence: parseFloat(trackData.valence) || 0.5,
      danceability: parseFloat(trackData.danceability) || 0.5,
      acousticness: parseFloat(trackData.acousticness) || 0.5,
      instrumentalness: parseFloat(trackData.instrumentalness) || 0.8,
      duration: parseInt(trackData.duration) || 160,
      plays: 1,
      likes: 0,
      releaseYear: new Date().getFullYear(),
      synthType: trackData.synthType || "lofi_chill",
      coverGradient: trackData.coverGradient || "linear-gradient(135deg, #FF6B6B, #556270)",
      coverIcon: trackData.coverIcon || "🎵",
      audioUrl: trackData.audioUrl || "",
      lyrics: trackData.lyrics || [
        { time: 5, text: "New track uploaded to HarmoniQ" },
        { time: 20, text: "Enjoy the sonic frequencies..." }
      ]
    };
    tracks.unshift(newTrack);
    this.saveTracks(tracks);
    return newTrack;
  }

  deleteTrack(id) {
    let tracks = this.getTracks();
    tracks = tracks.filter(t => t.id !== id);
    this.saveTracks(tracks);
  }

  incrementPlays(trackId) {
    const tracks = this.getTracks();
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      track.plays = (track.plays || 0) + 1;
      this.saveTracks(tracks);
    }
    this.addToHistory(trackId);
  }

  toggleLike(trackId) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    let liked = false;
    if (!currentUser.likedTracks) currentUser.likedTracks = [];

    const index = currentUser.likedTracks.indexOf(trackId);
    const tracks = this.getTracks();
    const track = tracks.find(t => t.id === trackId);

    if (index > -1) {
      currentUser.likedTracks.splice(index, 1);
      if (track && track.likes > 0) track.likes--;
      liked = false;
    } else {
      currentUser.likedTracks.push(trackId);
      if (track) track.likes = (track.likes || 0) + 1;
      liked = true;
    }

    this.updateUser(currentUser);
    this.saveTracks(tracks);
    return liked;
  }

  isTrackLiked(trackId) {
    const user = this.getCurrentUser();
    return user && user.likedTracks && user.likedTracks.includes(trackId);
  }

  // --- USERS & AUTH ---
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || SEED_USERS;
    } catch (e) {
      return SEED_USERS;
    }
  }

  getUser(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  getCurrentUser() {
    const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const users = this.getUsers();
    return users.find(u => u.id === userId) || users[0];
  }

  setCurrentUser(userId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  updateUser(updatedUser) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      users[idx] = updatedUser;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  switchRole(role) {
    const users = this.getUsers();
    const match = users.find(u => u.role === role);
    if (match) {
      this.setCurrentUser(match.id);
      return match;
    }
    return this.getCurrentUser();
  }

  addToHistory(trackId) {
    const user = this.getCurrentUser();
    if (!user) return;
    if (!user.history) user.history = [];

    // Filter out previous entry if present to push most recent to front
    user.history = user.history.filter(h => h.trackId !== trackId);
    user.history.unshift({ trackId, timestamp: Date.now() });

    // Keep max 50 entries
    if (user.history.length > 50) user.history.pop();
    this.updateUser(user);
  }

  // --- PLAYLISTS ---
  getPlaylists() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYLISTS)) || SEED_PLAYLISTS;
    } catch (e) {
      return SEED_PLAYLISTS;
    }
  }

  savePlaylists(playlists) {
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  }

  createPlaylist(title, description, trackIds = []) {
    const user = this.getCurrentUser();
    const playlists = this.getPlaylists();
    const gradients = [
      "linear-gradient(135deg, #667eea, #764ba2)",
      "linear-gradient(135deg, #ff758c, #ff7eb3)",
      "linear-gradient(135deg, #00c6ff, #0072ff)",
      "linear-gradient(135deg, #f857a6, #ff5858)",
      "linear-gradient(135deg, #43e97b, #38f9d7)"
    ];
    const newPlaylist = {
      id: "pl_" + Date.now(),
      title: title || "New Sonic Playlist",
      description: description || "Curated in HarmoniQ",
      creatorId: user ? user.id : "anonymous",
      creatorName: user ? user.name : "Guest",
      coverGradient: gradients[Math.floor(Math.random() * gradients.length)],
      trackIds: trackIds
    };
    playlists.push(newPlaylist);
    this.savePlaylists(playlists);
    return newPlaylist;
  }

  addTrackToPlaylist(playlistId, trackId) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl && !pl.trackIds.includes(trackId)) {
      pl.trackIds.push(trackId);
      this.savePlaylists(playlists);
      return true;
    }
    return false;
  }

  removeTrackFromPlaylist(playlistId, trackId) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.trackIds = pl.trackIds.filter(id => id !== trackId);
      this.savePlaylists(playlists);
      return true;
    }
    return false;
  }

  deletePlaylist(playlistId) {
    let playlists = this.getPlaylists();
    playlists = playlists.filter(p => p.id !== playlistId);
    this.savePlaylists(playlists);
  }

  // --- SETTINGS ---
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {};
    } catch (e) {
      return {};
    }
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  }

  // --- BACKUP & RESET ---
  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.TRACKS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.PLAYLISTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    this.init();
  }

  exportData() {
    return {
      tracks: this.getTracks(),
      users: this.getUsers(),
      playlists: this.getPlaylists(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
  }

  importData(dataObj) {
    if (dataObj.tracks) this.saveTracks(dataObj.tracks);
    if (dataObj.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(dataObj.users));
    if (dataObj.playlists) this.savePlaylists(dataObj.playlists);
    if (dataObj.settings) this.updateSettings(dataObj.settings);
  }
}

const storage = new StorageManager();
