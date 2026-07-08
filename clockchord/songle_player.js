/**
 * @typedef {{position: number, key: string}} SongKeyChange
 * @typedef {SongKeyChange[] & {handleBeatPlay: (position: number) => void, handleSeek: (position: number) => void}} SongKeyTimeline
 * @typedef {HTMLDivElement & {setSongKeyTimeline: (songKeyTimeline?: SongKeyTimeline, duration?: number) => void}} SongKeyTimelineElement
 */
const setupSongle = (chord, onChangeKey, onChangeBeat, onReady, searchParams) => {
  const widgetParent = document.getElementById("EmbeddedSongle");
  if( !widgetParent ) {
    alert("No container element found to embed Songle Widget");
    return;
  }
  const HTTPS_URL_PREFIX = "https://";
  const SONGLE_SONG_URL_PREFIX = `${HTTPS_URL_PREFIX}songle.jp/songs/`;
  /** @type {HTMLInputElement | null} */
  const urlInput = document.getElementById("SongleUrl");
  /** @type {HTMLInputElement | null} */
  const songKeyInput = document.getElementById("SongleKeySig");
  /** @type {HTMLButtonElement | null} */
  const loadButton = document.getElementById("LoadSongleUrl");
  const errorMessageElement = document.getElementById("SongleErrorMessage");
  /** @type {SongKeyTimelineElement | null} */
  const keyTimelineElement = document.getElementById("SongleKeyTimeline");
  const currentStatusBar = document.getElementById("songleCurrent");
  const songleVolume = document.getElementById("songleVolume");
  const positionElement = document.getElementById("songlePosition");
  const durationElement = document.getElementById("songleDuration");
  const tempoElement = document.getElementById("songleTempo");
  const bpmElement = tempoElement?.querySelector(".bpm");
  const chordElement = document.getElementById("songleChord");
  /** @type {HTMLInputElement | null} */
  const autoChordPlayCheckbox = document.getElementById("autoChordPlay");
  autoChordPlayCheckbox?.addEventListener("change", () => {
    autoChordPlayCheckbox.checked ? chord.clear() : chord.stop();
  });
  const showError = (message = "") => {
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
    } else if ( message ) {
      alert(message);
    }
  };
  /** @param {string} text */
  const toSongKeyTimeline = (text) => {
    if (!text) return;
    let position = 0;
    /** @type {SongKeyTimeline} */
    const timeline = text.split(",").reduce((tl, token, index) => {
      if (index & 1) {
        position = parseInt(token);
      } else {
        tl.push({ position, key: token });
      }
      return tl;
    }, []);
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
  keyTimelineElement && (keyTimelineElement.setSongKeyTimeline = (songKeyTimeline, duration) => {
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
  });
  /** @type {Record<number, string>} */
  const songleErrorMessages = {
    100: "Could not embed: Song deleted",
    101: "Could not embed: Not permitted",
    200: "Music map loading aborted",
    201: "Music map loading failed",
    300: "Sound file (mp3) download failed",
  };
  /** @param {number} status */
  const showSongleError = (status) => {
    showError(`Songle error ${status} : ${songleErrorMessages[status] ?? "Unknown error"}`);
  };
  let widgetElement, widget;
  songleVolume?.addEventListener("input", () => {
    if (widget) {
      widget.volume = songleVolume.value;
    }
  });
  const removeSongle = () => {
    currentStatusBar.style.display = "none";
    delete window.onSongleWidgetReady;
    delete window.onSongleWidgetError;
    chord.stop();
    if (widgetElement) {
      widgetElement.remove();
      widgetElement = undefined;
    }
    keyTimelineElement?.setSongKeyTimeline();
    [
      bpmElement,
      positionElement,
      durationElement,
      chordElement,
      errorMessageElement
    ].forEach((element) => element.textContent = "");
    PianoKeyboard.setSongTitleToDocument(undefined);
    urlInput.required = true; // Re-add the previously removed "required" attribute
  };
  const loadSongle = (params) => {
    const {songKeyTimelineText, ...otherParams} = params ?? {};
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
    if( typeof SongleWidgetAPI === "undefined" ) {
      showError("Songle Widget API not available now");
      return;
    }
    showError();
    urlInput.value = params.url;
    songKeyInput.value = songKeyTimelineText;
    if (!params.url) {
      return;
    }
    if (!songKeyTimelineText && typeof SONG_KEYS !== "undefined") {
      songKeyInput.value = SONG_KEYS.get(params.url) ?? "";
    }
    const songKeyTimeline = toSongKeyTimeline(songKeyInput.value);
    widgetElement = SongleWidgetAPI.createSongleWidgetElement({
      videoPlayerSizeW: "auto",
      videoPlayerSizeH: "auto",
      songleWidgetSizeW: "auto",
      ...otherParams
    });
    currentStatusBar.style.display = null;
    widgetParent.insertBefore(widgetElement, keyTimelineElement);
    //
    // Remove "required" attribute to accept the empty URL for removing the widget
    // (urlInput.required="false" does not remove the attribute)
    urlInput.removeAttribute("required");
    //
    window.onSongleWidgetReady = (apiKey, songleWidget) => {
      const { song } = widget = songleWidget;
      PianoKeyboard.setSongTitleToDocument(`${song.title} by ${song.artist.name}`);
      widget.volume = songleVolume.value = SongleWidgetAPI.computeAverageVolume(widget);
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
        bpmElement.textContent = `${Math.round(widget.bpm)}`;
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
      showSongleError(status);
    };
  };
  const params = {
    api: "clockchord-songle-player",
    url: undefined,
    songKeyTimelineText: searchParams.get("keysig") ?? searchParams.get("key") ?? "",
    songStartAt: searchParams.get("at"),
    songAutoPlay: searchParams.get("autoplay"),
    songAutoLoop: searchParams.get("loop"),
  };
  loadButton?.addEventListener("click", () => {
    if( !urlInput.reportValidity() ) {
      return;
    }
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
    params.url = url;
    params.songKeyTimelineText = songKeyInput.value;
    loadSongle(params);
  });
  (params.url = searchParams.get("songle") ?? searchParams.get("url")) && loadSongle(params);
};
