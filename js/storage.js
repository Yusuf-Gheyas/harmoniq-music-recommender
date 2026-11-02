/**
 * HarmoniQ Storage Manager
 * Persistent state management using LocalStorage with automated schema migration.
 */

const STORAGE_KEYS = {
  TRACKS: "harmoniq_tracks_v2",
  USERS: "harmoniq_users_v2",
  CURRENT_USER_ID: "harmoniq_current_user_id_v2",
  PLAYLISTS: "harmoniq_playlists_v2",
  SETTINGS: "harmoniq_settings_v2"
};

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    const existing = localStorage.getItem(STORAGE_KEYS.TRACKS);
    if (!existing) {
      this.resetAll();
      return;
    }

    try {
      const parsed = JSON.parse(existing);
      if (!parsed || !parsed.length || !parsed[0].coverUrl) {
        this.resetAll();
      }
    } catch (e) {
      this.resetAll();
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
      genre: trackData.genre || "Pop",
      mood: trackData.mood || "Hype",
      bpm: parseInt(trackData.bpm) || 120,
      energy: parseFloat(trackData.energy) || 0.7,
      valence: parseFloat(trackData.valence) || 0.6,
      danceability: parseFloat(trackData.danceability) || 0.7,
      acousticness: parseFloat(trackData.acousticness) || 0.2,
      instrumentalness: parseFloat(trackData.instrumentalness) || 0.0,
      duration: 30,
      plays: 1,
      likes: 0,
      releaseYear: new Date().getFullYear(),
      coverUrl: trackData.coverUrl || "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/71/12/03/711203e0-f7b9-9f4e-caff-540736fda45c/20UMGIM25005.rgb.jpg/600x600bb.jpg",
      audioUrl: trackData.audioUrl || "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0a/f5/7a/0af57ad0-56bd-7665-e7c4-efccb337866b/mzaf_11974826629383453.plus.aac.p.m4a",
      lyrics: trackData.lyrics || [
        { time: 2, text: "HarmoniQ community release" },
        { time: 10, text: "Streaming high quality audio" }
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

    if (!currentUser.likedTracks) currentUser.likedTracks = [];
    const index = currentUser.likedTracks.indexOf(trackId);
    const tracks = this.getTracks();
    const track = tracks.find(t => t.id === trackId);
    let liked = false;

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

  addToHistory(trackId) {
    const user = this.getCurrentUser();
    if (!user) return;
    if (!user.history) user.history = [];

    user.history = user.history.filter(h => h.trackId !== trackId);
    user.history.unshift({ trackId, timestamp: Date.now() });

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
    const sampleCovers = [
      "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/71/12/03/711203e0-f7b9-9f4e-caff-540736fda45c/20UMGIM25005.rgb.jpg/600x600bb.jpg",
      "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg",
      "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg"
    ];
    const newPlaylist = {
      id: "pl_" + Date.now(),
      title: title || "New Playlist",
      description: description || "Curated in HarmoniQ",
      creatorId: user ? user.id : "anonymous",
      creatorName: user ? user.name : "Guest",
      coverUrl: sampleCovers[Math.floor(Math.random() * sampleCovers.length)],
      trackIds: trackIds
    };
    playlists.push(newPlaylist);
    this.savePlaylists(playlists);
    return newPlaylist;
  }

  deletePlaylist(playlistId) {
    let playlists = this.getPlaylists();
    playlists = playlists.filter(p => p.id !== playlistId);
    this.savePlaylists(playlists);
  }

  resetAll() {
    localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(SEED_TRACKS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, "user_yusuf");
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(SEED_PLAYLISTS));
  }
}

const storage = new StorageManager();
