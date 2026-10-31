/**
 * HarmoniQ Main Application Entrypoint
 * Bootstraps engines, registers global shortcut handlers,
 * and sets up window lifecycle events.
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚡ Bootstrapping HarmoniQ Music Recommendation System...");

  // Initialize UI
  ui.init();

  // Register Global Keyboard Shortcuts for Pro Listening Experience
  window.addEventListener("keydown", e => {
    // Ignore keystrokes inside input / textarea
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      return;
    }

    switch (e.code) {
      case "Space":
        e.preventDefault();
        audio.togglePlay();
        break;
      case "ArrowRight":
        e.preventDefault();
        audio.seek(audio.currentTime + 5);
        break;
      case "ArrowLeft":
        e.preventDefault();
        audio.seek(audio.currentTime - 5);
        break;
      case "KeyN":
        ui.playNext();
        break;
      case "KeyP":
        ui.playPrevious();
        break;
      case "KeyM":
        const muteBtn = document.getElementById("btnMute");
        if (muteBtn) muteBtn.click();
        break;
      case "KeyL":
        const likeBtn = document.getElementById("playerLikeBtn");
        if (likeBtn) likeBtn.click();
        break;
      case "KeyK":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const searchInput = document.getElementById("globalSearchInput");
          if (searchInput) searchInput.focus();
        }
        break;
    }
  });

  console.log("✅ HarmoniQ initialized successfully. Ready for evaluation.");
});
