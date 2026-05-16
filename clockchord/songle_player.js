
const setupSongle = (chord, onChangeKey, onChangeBeat, onReady, searchParams) => {
  const widgetParent = document.getElementById("EmbeddedSongle");
  if( !widgetParent ) {
    alert("No container element found to embed Songle Widget");
    return;
  }
  const SONGLE_SONG_URL_PREFIX = "https://songle.jp/songs/";
  const HTTPS_URL_PREFIX = "https://";
  const urlInput = document.getElementById("SongleUrl");
  const songKeyInput = document.getElementById("SongleKeySig");
  const loadButton = document.getElementById("LoadSongleUrl");
  const errorMessageElement = document.getElementById("SongleErrorMessage");
  const keyTimelineElement = document.getElementById("SongleKeyTimeline");
  const currentStatusBar = document.getElementById("songleCurrent");
  const positionElement = document.getElementById("songlePosition");
  const durationElement = document.getElementById("songleDuration");
  const tempoElement = document.getElementById("songleTempo");
  const bpmElement = tempoElement?.querySelector(".bpm");
  const chordElement = document.getElementById("songleChord");
  /** @type {HTMLInputElement} */
  const autoChordPlayCheckbox = document.getElementById("autoChordPlay");
  autoChordPlayCheckbox?.addEventListener("change", () => {
    autoChordPlayCheckbox.checked ? chord.clear() : chord.stop();
  });
  const toSongKeyTimeline = (text) => {
    if (!text) return;
    let t;
    const timeline = text.split(",").reduce((tl, token, index) => {
      if (index & 1) {
        tl.push(t = { position: parseInt(token) });
      } else {
        t.key = token;
      }
      return tl;
    }, [t = { position: 0 }]);
    let nextIndex = 1;
    let nextPosition = timeline[nextIndex]?.position;
    timeline.handleBeatPlay = (newPosition) => {
      if (nextPosition > newPosition) return;
      const t = timeline[nextIndex];
      if (t) onChangeKey?.(t.key);
      nextPosition = timeline[++nextIndex]?.position;
    };
    timeline.handleSeek = (newPosition) => {
      nextIndex = timeline.findIndex((t) => t.position > newPosition);
      if (nextIndex < 0) nextIndex = timeline.length;
      onChangeKey?.(timeline[nextIndex > 0 ? nextIndex - 1 : 0].key);
      nextPosition = timeline[nextIndex]?.position;
    };
    return timeline;
  };
  keyTimelineElement.setSongKeyTimeline = (songKeyTimeline, duration) => {
    while (keyTimelineElement.firstChild) {
      keyTimelineElement.removeChild(keyTimelineElement.firstChild);
    }
    if (!songKeyTimeline) {
      return;
    }
    songKeyTimeline.forEach((t, i) => {
      const { position, key } = t;
      const endPosition = songKeyTimeline[i + 1]?.position ?? duration;
      const element = document.createElement("div");
      element.textContent = i ? key : `🔑${key}`;
      element.classList.add("key");
      element.style.width = `${(endPosition - position) / duration * 100}%`;
      keyTimelineElement.appendChild(element);
    });
  };
  const errorMessages = {
    100: "Could not embed: Song deleted",
    101: "Could not embed: Not permitted",
    200: "Music map loading aborted",
    201: "Music map loading failed",
    300: "Sound file (mp3) download failed",
  };
  let widgetElement, widget;
  const removeSongle = () => {
    currentStatusBar.style.display = "none";
    delete window.onSongleWidgetReady;
    delete window.onSongleWidgetError;
    chord.stop();
    if (widgetElement) {
      widgetElement.remove();
      widgetElement = undefined;
    }
    keyTimelineElement.setSongKeyTimeline();
    [
      bpmElement,
      positionElement,
      durationElement,
      chordElement,
      errorMessageElement
    ].forEach((element) => element.textContent = "");
    PianoKeyboard.setSongTitleToDocument(undefined);
  };
  const loadSongle = (urlText, songKeyTimelineText) => {
    if (widget) {
      const { remove } = widget;
      if (remove) {
        remove();
      } else {
        console.warn("Function widget.remove() undefined, so skipped");
      }
      widget = undefined;
      removeSongle();
    }
    urlInput.value = urlText;
    songKeyInput.value = songKeyTimelineText;
    if (!urlText) {
      return;
    }
    if (!songKeyTimelineText && typeof SONG_KEYS !== "undefined") {
      songKeyInput.value = SONG_KEYS.get(urlText) ?? "";
    }
    const songKeyTimeline = toSongKeyTimeline(songKeyInput.value);
    widgetElement = SongleWidgetAPI.createSongleWidgetElement({
      api: "songle-link",
      url: urlText,
      songAutoPlay: true,
      videoPlayerSizeW: "auto",
      videoPlayerSizeH: "auto",
      songleWidgetSizeW: "auto",
    });
    currentStatusBar.style.display = null;
    widgetParent.insertBefore(widgetElement, keyTimelineElement);
    window.onSongleWidgetReady = (apiKey, songleWidget) => {
      const { song } = widget = songleWidget;
      PianoKeyboard.setSongTitleToDocument(`${song.title} by ${song.artist.name}`);
      const duration = widget.duration.milliseconds;
      const timePosition = widget.position.milliseconds;
      keyTimelineElement.setSongKeyTimeline(songKeyTimeline, duration);
      durationElement.textContent = `${Math.floor(duration)}`;
      positionElement.textContent = `${Math.floor(timePosition)}`;
      if( widget.mode === SongleWidgetAPI.NN_VIDEO_MODE ) {
        // Cancel the delay in Niconico Video
        widget.setAllEventTimingOffset(-100);
        widget.eventPollingInterval = 1; // [ms]
      }
      widget.on("chordPlay", (event) => {
        const chordSymbol = event.chord.name;
        chordElement.textContent = chordSymbol;
        if (autoChordPlayCheckbox.checked) {
          chord.parseText(chordSymbol);
          chord.start();
        }
      });
      widget.on("beatPlay", (event) => {
        const numerator = event.bar.beats.length || 4;
        const beatPosition = event.beat.position;
        onChangeBeat?.(beatPosition - 1, numerator);
        if (autoChordPlayCheckbox.checked) {
          chord.start();
        }
        const timePosition = widget.position.milliseconds;
        positionElement.textContent = `${Math.floor(timePosition)}`;
        bpmElement.textContent = `${Math.round(event.beat.bpm)}`;
        tempoElement.style.display = null;
        songKeyTimeline?.handleBeatPlay(timePosition);
      });
      const handleSeek = () => {
        const timePosition = widget.position.milliseconds;
        positionElement.textContent = `${Math.floor(timePosition)}`;
        songKeyTimeline && setTimeout(() => songKeyTimeline.handleSeek(timePosition), 0);
      };
      widget.on("seek", handleSeek);
      widget.on("play", handleSeek);
      widget.on("pause", () => { chord.stop(); });
      widget.on("finish", () => {
        chord.stop();
        chordElement.textContent = "";
      });
      onReady?.();
    };
    window.onSongleWidgetError = (apiKey, songleWidget) => {
      const { status } = widget = songleWidget;
      const formattedMessage = `Songle error ${status} : ${errorMessages[status] ?? "Unknown error"}`;
      if (errorMessageElement) {
        errorMessageElement.textContent = formattedMessage;
      } else {
        alert(formattedMessage);
      }
    };
  };
  loadButton?.addEventListener("click", () => {
    let url = urlInput.value;
    try {
      // Decode if percent-encoded URL entered (such as the content URL copied from Songle URL)
      url = decodeURIComponent(url);
      if (url.startsWith(SONGLE_SONG_URL_PREFIX)) {
        url = url.replace(SONGLE_SONG_URL_PREFIX, "");
      } else if (url.startsWith(HTTPS_URL_PREFIX)) {
        url = url.replace(HTTPS_URL_PREFIX, "");
      }
    } catch (error) {
      console.error(error);
    }
    loadSongle(url, songKeyInput.value);
  });
  const initialUrlText = searchParams.get("songle") ?? searchParams.get("url");
  if (initialUrlText) {
    loadSongle(initialUrlText, searchParams.get("keysig") ?? searchParams.get("key"));
  }
};
