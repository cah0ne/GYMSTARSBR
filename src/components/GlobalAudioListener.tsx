import { useEffect, useRef, useState } from "react";
import { db, doc, onSnapshot } from "../lib/firebase";
import { Play, Pause } from "lucide-react";

const fixDropboxUrl = (url: string) => {
  if (!url) return url;
  if (url?.includes?.("dropbox.com")) {
    // Replace dl=0 or dl=1 with raw=1 for direct access
    return url.replace(/dl=[012]/, "raw=1");
  }
  return url;
};

// Standard HTMLAudioElement singletons for global reuse to bypass iOS Safari restrictions
export const musicAudio = new Audio();
export const sfxAudio = new Audio();

const SILENT_SRC =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAD";

export const unlockGlobalAudio = () => {
  try {
    if (musicAudio.src === "" || sfxAudio.src === "") {
      musicAudio.loop = true;
      musicAudio.volume = 0.01;
      musicAudio.src = SILENT_SRC;

      sfxAudio.src = SILENT_SRC;
      sfxAudio.loop = false;

      musicAudio.play().catch(() => {});
      sfxAudio.play().catch(() => {});
    }
  } catch (err) {}
};

// Global Audio State Variables for module-level access
export let isGymnastMusicPlaying = false;
export let commandStartedAt: number | null = null;
export let localAudioPaused = false;
let lastProcessedTime = 0;

export const playSilentLoop = () => {
  console.log(
    "Playing continuous silent background loop to keep audio thread alive",
  );
  isGymnastMusicPlaying = false;
  commandStartedAt = null;
  try {
    musicAudio.pause();
    musicAudio.loop = true;
    musicAudio.src = SILENT_SRC;
    musicAudio.volume = 0.01; // Active but virtually silent
    musicAudio
      .play()
      .then(() => {
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
          navigator.mediaSession.metadata = new MediaMetadata({
            title: "Áudio Ao Vivo Conectado",
            artist: "GymStars Brasil",
            album: "Transmissão Digital",
          });
        }
      })
      .catch((e) => console.log("Silent loop start blocked/prevented:", e));
  } catch (e) {
    console.log("Silent loop initialization error:", e);
  }
};

export const processAudioCommand = (data: any) => {
  console.log("Audio command received:", data);

  // Only play if it's a new command and within a reasonable timeframe (3 hours) to account for severe clock desync between devices
  const updatedAt =
    typeof data.updatedAt === "string"
      ? Date.parse(data.updatedAt)
      : data.updatedAt;

  if (
    updatedAt &&
    updatedAt > lastProcessedTime &&
    updatedAt > Date.now() - 1000 * 60 * 60 * 3
  ) {
    lastProcessedTime = updatedAt;

    if (data.action === "stop_music") {
      console.log("Stopping active music universally");
      try {
        isGymnastMusicPlaying = false;
        commandStartedAt = null;
        playSilentLoop();
      } catch (e) {
        console.log("Pause/Reset music error:", e);
      }
      return;
    }

    const audioUrl = fixDropboxUrl(data.url);

    if (data.action === "beep") {
      const defaultBeep =
        "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3";
      const finalBeepUrl = audioUrl || defaultBeep;
      console.log("Playing beep/SFX:", finalBeepUrl);
      try {
        sfxAudio.src = finalBeepUrl;
        sfxAudio.volume = 0.5;
        sfxAudio
          .play()
          .catch((e) => console.log("SFX play blocked/aborted:", e));
      } catch (e) {
        console.log("Beep audio play failure:", e);
      }
    } else if (data.action === "play_music" && audioUrl) {
      console.log("Playing gymnastics music with real-time sync:", audioUrl);
      try {
        isGymnastMusicPlaying = true;
        commandStartedAt = updatedAt;

        // Disable triggerBeep in play_music context forcefully
        // (Handled manually by the user via beep action)

        musicAudio.pause();
        musicAudio.loop = false;
        musicAudio.src = audioUrl;
        musicAudio.volume = 0.95;

        // Set initial offset once metadata is loaded
        musicAudio.onloadedmetadata = () => {
          musicAudio.currentTime = 0;
        };

        musicAudio
          .play()
          .then(() => {
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
              navigator.mediaSession.metadata = new MediaMetadata({
                title: data.gymnastName || "Música em Execução",
                artist: data.team || "Ginasta em Quadra",
                album: data.category
                  ? `Série - ${data.category}`
                  : "GymStars Brasil",
              });
            }
          })
          .catch((e) => {
            console.log("Music play blocked/aborted, waiting for gesture:", e);
            // Do NOT call playSilentLoop(), keep the real src loaded for manual unlock
          });
      } catch (e) {
        console.log("Music audio play failure:", e);
        playSilentLoop();
      }
    }
  }
};

export default function GlobalAudioListener() {
  const [unlocked, setUnlocked] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [isPausedLocally, setIsPausedLocally] = useState(
    () => localAudioPaused,
  );

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (isGymnastMusicPlaying && musicAudio.paused && !localAudioPaused) {
        setNeedsGesture(true);
      } else {
        setNeedsGesture(false);
      }
      setIsPausedLocally(localAudioPaused);
    }, 1000);
    return () => clearInterval(checkInterval);
  }, []);

  const handleUnlockAndActivate = () => {
    try {
      if (!isGymnastMusicPlaying) {
        musicAudio.loop = true;
        musicAudio.volume = 0.01;
        musicAudio.src = SILENT_SRC;
      } else {
        if (commandStartedAt) {
          const expectedElapsed = (Date.now() - commandStartedAt) / 1000;
          musicAudio.currentTime = expectedElapsed;
        }
      }

      const sfxEmpty =
        !sfxAudio.src ||
        sfxAudio.src === "" ||
        sfxAudio.src === window.location.href;
      if (sfxEmpty) {
        sfxAudio.src = SILENT_SRC;
        sfxAudio.loop = false;
      }

      const p1 = musicAudio.play();
      const p2 = sfxAudio.play();

      Promise.all([p1, p2])
        .then(() => {
          console.log("Audio engines successfully unlocked!");
          setUnlocked(true);

          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
            navigator.mediaSession.metadata = new MediaMetadata({
              title: "Áudio Ao Vivo Conectado",
              artist: "GymStars Brasil",
              album: "Transmissão Digital",
            });
            navigator.mediaSession.setActionHandler("play", () => {
              localAudioPaused = false;
              setIsPausedLocally(false);
              musicAudio.play().catch((e) => console.log(e));
            });
            navigator.mediaSession.setActionHandler("pause", () => {
              localAudioPaused = true;
              setIsPausedLocally(true);
              musicAudio.pause();
            });
            navigator.mediaSession.setActionHandler("stop", () => {
              if (isGymnastMusicPlaying) {
                // Ignore lock screen stop during active performance to lock timing
              } else {
                musicAudio.pause();
                playSilentLoop();
              }
            });
            navigator.mediaSession.setActionHandler("seekto", () => {
              // Ignore seek to avoid manipulation
            });
            navigator.mediaSession.setActionHandler("seekbackward", () => {
              // Ignore skip backward
            });
            navigator.mediaSession.setActionHandler("seekforward", () => {
              // Ignore skip forward
            });
          }
        })
        .catch((e) => {
          console.log("Audio unlock failed, waiting for user gesture.", e);
        });
    } catch (err) {
      console.log("Unlock error", err);
    }
  };

  useEffect(() => {
    // Listen for the first click or touch on the document to automatically unlock audio
    const autoUnlock = () => {
      handleUnlockAndActivate();
      window.removeEventListener("click", autoUnlock);
      window.removeEventListener("touchstart", autoUnlock);
    };

    window.addEventListener("click", autoUnlock);
    window.addEventListener("touchstart", autoUnlock);

    return () => {
      window.removeEventListener("click", autoUnlock);
      window.removeEventListener("touchstart", autoUnlock);
    };
  }, []);

  useEffect(() => {
    // Return to looping silence when gymnast music is completed
    musicAudio.onended = () => {
      console.log(
        "Gymnast music track ended naturally, returning to silent looping",
      );
      isGymnastMusicPlaying = false;
      playSilentLoop();
    };

    return () => {
      musicAudio.onended = null;
    };
  }, []);

  useEffect(() => {
    const handlePause = () => {
      if (localAudioPaused) return;
      if (isGymnastMusicPlaying && commandStartedAt) {
        // We only enforce pause-locking, we do not force timeline position
        // so that slight drifting doesn't crash or stutter the audio.
        if (
          musicAudio.duration &&
          musicAudio.currentTime > musicAudio.duration - 1
        ) {
          isGymnastMusicPlaying = false;
          playSilentLoop();
          return;
        }
        console.log(
          "Force-resume: user/system paused during synchronized live play!",
        );
        musicAudio.play().catch((e) => console.log("Force-resume failed:", e));
      }
    };

    musicAudio.addEventListener("pause", handlePause);

    return () => {
      musicAudio.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "liveCommand", "audio"), (snap) => {
      if (snap.exists()) {
        processAudioCommand(snap.data());
      }
    });

    return () => unsub();
  }, []);

  const handleTogglePlay = () => {
    if (!unlocked || needsGesture) {
      handleUnlockAndActivate();
      setNeedsGesture(false);
      localAudioPaused = false;
      setIsPausedLocally(false);
    } else {
      localAudioPaused = !localAudioPaused;
      setIsPausedLocally(localAudioPaused);
      if (localAudioPaused) {
        musicAudio.pause();
        sfxAudio.pause();
      } else {
        if (isGymnastMusicPlaying && commandStartedAt) {
          const expectedElapsed = (Date.now() - commandStartedAt) / 1000;
          musicAudio.currentTime = expectedElapsed;
        }
        musicAudio.play().catch((e) => console.log(e));
      }
    }
  };

  return (
    <div
      className={`fixed bottom-6 ${needsGesture ? "right-6 sm:left-auto" : "left-6"} z-[9999] animate-bounce`}
    >
      <button
        onClick={handleTogglePlay}
        title={
          needsGesture
            ? "Música bloqueada! Clique para ouvir"
            : isPausedLocally
              ? "Play: Continuar ouvindo"
              : "Pause: Desligar áudio"
        }
        className={`flex items-center justify-center shadow-2xl transition-all cursor-pointer hover:scale-110 active:scale-95 ${
          needsGesture
            ? "bg-red-600 hover:bg-red-500 text-white rounded-full px-6 py-4 animate-pulse border border-red-400"
            : "bg-[#ffdf00] hover:bg-[#ffe63b] text-[#050B14] w-14 h-14 rounded-full border border-[#ffdf00]/30"
        }`}
      >
        {isPausedLocally || needsGesture || !unlocked ? (
          <Play
            className={`w-6 h-6 ml-0.5 ${needsGesture ? "fill-white text-white" : "fill-[#050B14] text-[#050B14]"}`}
          />
        ) : (
          <Pause className="w-6 h-6 fill-[#050B14] text-[#050B14]" />
        )}
        {needsGesture && (
          <span className="ml-2 font-bold tracking-wider">
            TOCAR ÁUDIO AO VIVO
          </span>
        )}
      </button>
    </div>
  );
}
