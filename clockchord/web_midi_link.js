
/** @param {(data: number[]) => void} [onMessage] */
const setupWebMidiLink = (onMessage) => {
  const ID_MIDI = "midi";
  /** @param {MessageEvent<string>} event */
  const midiMessageListener = (event) => {
    const strs = event.data.split?.(",");
    if( ! strs ) {
      // Ignore non-string message from other source (such as Songle)
      return;
    }
    const id = strs.shift();
    switch(id) {
      case ID_MIDI:
        onMessage?.(strs.map((hexStr) => parseInt(hexStr, 16)));
        break;
    }
  };
  window.addEventListener('message', midiMessageListener);
  /** @type {HTMLInputElement} */
  const urlElement = document.getElementById('WebMidiLinkUrl');
  /** @type {HTMLButtonElement} */
  const loadButton = document.getElementById('LoadWebMidiLinkUrl');
  /** @type {HTMLIFrameElement} */
  const iFrame = document.getElementById('WebMidiLinkSynth');
  if( urlElement && loadButton && iFrame ) {
    const parent = iFrame.parentNode;
    const attach = () => parent.contains(iFrame) || parent.appendChild(iFrame);
    const detach = () => parent.contains(iFrame) && parent.removeChild(iFrame);
    detach();
    loadButton.addEventListener('click', () => {
      const url = urlElement.value;
      if( url ) {
        attach();
        iFrame.src = url;
      } else {
        iFrame.src = undefined;
        detach();
      }
    });
    /** @param {number[]} data */
    return (data) => {
      iFrame.contentWindow?.postMessage(
        data.reduce((str, num) => `${str},${(num).toString(16)}`, ID_MIDI),
        "*"
      );
    };
  }
};
