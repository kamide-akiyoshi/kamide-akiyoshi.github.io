// @ts-check
/** @param {(data: number[]) => void} [onMessage] */
const setupWebMidiLink = (onMessage) => {
  const ID_MIDI = "midi";
  //
  // Add WebMidiLink message receiver
  window.addEventListener(
    'message',
    (event) => {
      if( typeof event.data !== "string" ) {
        // Ignore non-string message from other source such as Songle
        return;
      }
      const strs = event.data.split(",");
      const id = strs.shift();
      switch(id) {
        case ID_MIDI:
          onMessage?.(strs.map((hexStr) => parseInt(hexStr, 16)));
          break;
      }
    }
  );
  //
  // Return WebMidiLink message sender if available
  const iFrame = document.getElementById('WebMidiLinkSynth');
  if( !(iFrame instanceof HTMLIFrameElement) ) return;
  const urlElement = document.getElementById('WebMidiLinkUrl');
  if( !(urlElement instanceof HTMLInputElement) ) return;
  const loadButton = document.getElementById('LoadWebMidiLinkUrl');
  if( !(loadButton instanceof HTMLButtonElement) ) return;
  const parent = iFrame.parentNode;
  const attach = () => parent?.contains(iFrame) || parent?.appendChild(iFrame);
  const detach = () => parent?.contains(iFrame) && parent.removeChild(iFrame);
  detach();
  loadButton.addEventListener('click', () => {
    const url = urlElement.value;
    if( url ) {
      attach(); iFrame.src = url; return;
    }
    iFrame.src = ""; detach();
  });
  /** @param {number[]} data */
  return (data) => {
    iFrame.contentWindow?.postMessage(
      data.reduce((str, num) => `${str},${(num).toString(16)}`, ID_MIDI),
      "*"
    );
  };
};
