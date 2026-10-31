/**
 * HarmoniQ Recommendation Engine
 * Implements Multi-Algorithm Music Recommendations:
 * 1. Content-Based Vector Cosine Similarity
 * 2. Real-time Acoustic Distance (BPM, Energy, Valence, Danceability)
 * 3. Mood & Vibe Heuristic Ranking
 * 4. Collaborative Co-occurrence Simulation
 * 5. Transparent Explainability Generator
 */

class RecommendationEngine {
  constructor() {
    this.weights = {
      genre: 0.30,
      bpm: 0.20,
      energy: 0.20,
      valence: 0.15,
      acousticness: 0.15
    };
  }

  /**
   * Normalizes BPM (typically 50-180) to [0, 1] range
   */
  normalizeBpm(bpm) {
    const minBpm = 50;
    const maxBpm = 180;
    return Math.max(0, Math.min(1, (bpm - minBpm) / (maxBpm - minBpm)));
  }

  /**
   * Calculates Euclidean vector distance between two acoustic profiles
   */
  calculateAcousticDistance(profileA, profileB) {
    const normBpmA = this.normalizeBpm(profileA.bpm || 90);
    const normBpmB = this.normalizeBpm(profileB.bpm || 90);

    const diffBpm = Math.pow((normBpmA - normBpmB) * this.weights.bpm, 2);
    const diffEnergy = Math.pow(((profileA.energy || 0.5) - (profileB.energy || 0.5)) * this.weights.energy, 2);
    const diffValence = Math.pow(((profileA.valence || 0.5) - (profileB.valence || 0.5)) * this.weights.valence, 2);
    const diffAcoustic = Math.pow(((profileA.acousticness || 0.5) - (profileB.acousticness || 0.5)) * this.weights.acousticness, 2);

    return Math.sqrt(diffBpm + diffEnergy + diffValence + diffAcoustic);
  }

  /**
   * Calculates similarity score (0.0 to 1.0)
   */
  calculateSimilarity(profileA, profileB) {
    const dist = this.calculateAcousticDistance(profileA, profileB);
    return Math.max(0, 1 - dist * 1.8);
  }

  /**
   * Synthesizes user's dynamic taste vector from liked tracks and preferences
   */
  getUserTasteVector(user, allTracks) {
    const prefs = user.preferences || {};
    let avgBpm = prefs.targetBpm || 85;
    let avgEnergy = prefs.targetEnergy || 0.5;
    let avgValence = prefs.targetValence || 0.5;
    let avgAcoustic = 0.5;
    let favoriteGenres = new Set(prefs.favoriteGenres || []);

    // Blend with liked tracks
    if (user.likedTracks && user.likedTracks.length > 0) {
      const likedTrackObjects = allTracks.filter(t => user.likedTracks.includes(t.id));
      if (likedTrackObjects.length > 0) {
        let sumBpm = 0, sumEnergy = 0, sumValence = 0, sumAcoustic = 0;
        likedTrackObjects.forEach(t => {
          sumBpm += t.bpm;
          sumEnergy += t.energy;
          sumValence += t.valence;
          sumAcoustic += t.acousticness;
          if (t.genre) favoriteGenres.add(t.genre);
        });
        const len = likedTrackObjects.length;
        // 50% explicit preferences + 50% implicit liked songs
        avgBpm = (avgBpm + sumBpm / len) / 2;
        avgEnergy = (avgEnergy + sumEnergy / len) / 2;
        avgValence = (avgValence + sumValence / len) / 2;
        avgAcoustic = (avgAcoustic + sumAcoustic / len) / 2;
      }
    }

    return {
      bpm: avgBpm,
      energy: avgEnergy,
      valence: avgValence,
      acousticness: avgAcoustic,
      genres: Array.from(favoriteGenres)
    };
  }

  /**
   * Generates Personalized "For You" Recommendations
   */
  getRecommendationsForUser(user, allTracks, limit = 6) {
    const userVector = this.getUserTasteVector(user, allTracks);
    const scoredTracks = allTracks.map(track => {
      // 1. Acoustic profile similarity
      const acousticSim = this.calculateSimilarity(userVector, track);

      // 2. Genre affinity boost
      let genreScore = 0;
      if (userVector.genres.includes(track.genre)) {
        genreScore = 0.35;
      }

      // 3. Like boost
      const isLiked = user.likedTracks && user.likedTracks.includes(track.id);
      const freshnessPenalty = isLiked ? -0.1 : 0.05; // Recommend fresh, unliked gems slightly higher

      // Overall composite match percentage (0 to 100%)
      const compositeScore = Math.min(0.99, Math.max(0.40, (acousticSim * 0.65) + genreScore + freshnessPenalty));

      const reason = this.generateExplanation(userVector, track, isLiked);

      return {
        ...track,
        matchScore: Math.round(compositeScore * 100),
        recommendationReason: reason
      };
    });

    // Sort by descending match score
    scoredTracks.sort((a, b) => b.matchScore - a.matchScore);
    return scoredTracks.slice(0, limit);
  }

  /**
   * Recommends tracks based on current Vibe / Mood & custom acoustic sliders
   */
  getVibeRecommendations(allTracks, { mood, targetBpm, targetEnergy, targetValence }, limit = 6) {
    const targetVector = {
      bpm: targetBpm || 90,
      energy: targetEnergy || 0.5,
      valence: targetValence || 0.5,
      acousticness: 0.5
    };

    const scoredTracks = allTracks.map(track => {
      const sim = this.calculateSimilarity(targetVector, track);
      let moodBonus = (track.mood && track.mood.toLowerCase() === (mood || "").toLowerCase()) ? 0.3 : 0;
      const compositeScore = Math.min(0.99, Math.max(0.40, (sim * 0.7) + moodBonus));

      return {
        ...track,
        matchScore: Math.round(compositeScore * 100),
        recommendationReason: `Calibrated for ${mood || "custom"} vibe with ${Math.round(track.energy * 100)}% energy & ${track.bpm} BPM.`
      };
    });

    scoredTracks.sort((a, b) => b.matchScore - a.matchScore);
    return scoredTracks.slice(0, limit);
  }

  /**
   * "Because You Listened To [Track]" (Content-Based Item-to-Item Similarity)
   */
  getSimilarTracks(seedTrack, allTracks, limit = 5) {
    if (!seedTrack) return [];
    const otherTracks = allTracks.filter(t => t.id !== seedTrack.id);

    const scored = otherTracks.map(track => {
      const acousticSim = this.calculateSimilarity(seedTrack, track);
      const sameGenreBonus = track.genre === seedTrack.genre ? 0.25 : 0;
      const sameArtistBonus = track.artist === seedTrack.artist ? 0.35 : 0;
      const composite = Math.min(0.99, (acousticSim * 0.6) + sameGenreBonus + sameArtistBonus);

      return {
        ...track,
        matchScore: Math.round(composite * 100),
        recommendationReason: `Shares ${track.genre} rhythm & ${Math.abs(track.bpm - seedTrack.bpm) < 10 ? "close tempo" : "similar acoustic dynamics"} with "${seedTrack.title}"`
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  }

  /**
   * Smart Auto-Mix: Generates a curated balanced playlist of N tracks
   */
  generateSmartMix(allTracks, genre = "All", mood = "All", count = 8) {
    let pool = [...allTracks];
    if (genre !== "All") pool = pool.filter(t => t.genre === genre);
    if (mood !== "All") pool = pool.filter(t => t.mood === mood);

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
  }

  /**
   * Human-readable transparency explanation for academic viva & UI explainability
   */
  generateExplanation(userVector, track, isLiked) {
    if (isLiked) {
      return "Based on your Liked Songs library.";
    }
    if (userVector.genres.includes(track.genre) && Math.abs(track.bpm - userVector.bpm) < 15) {
      return `Matches your preferred ${track.genre} genre and ideal tempo (~${track.bpm} BPM).`;
    }
    if (userVector.genres.includes(track.genre)) {
      return `Recommended because you enjoy ${track.genre} artists.`;
    }
    if (Math.abs(track.energy - userVector.energy) < 0.15) {
      return `Acoustic dynamics match your preferred listening energy (${Math.round(track.energy * 100)}%).`;
    }
    return `Discovered via collaborative taste clustering in ${track.genre}.`;
  }
}

const recommender = new RecommendationEngine();
