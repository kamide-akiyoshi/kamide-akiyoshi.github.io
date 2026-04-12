
const setupWebMidiLink = (onMessage) => {
  const ID_MIDI = "midi";
  window.addEventListener('message', event => {
    const msg = event.data.split?.(",");
    if( ! msg ) {
      // Ignore non-string message from other source (such as Songle)
      return;
    }
    const id = msg.shift();
    switch(id) {
      case ID_MIDI:
        onMessage?.(msg.map(hexStr => parseInt(hexStr, 16)));
        break;
    }
  });
  const urlElement = document.getElementById('WebMidiLinkUrl');
  const loadButton = document.getElementById('LoadWebMidiLinkUrl');
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
    return (msg) => {
      iFrame.contentWindow?.postMessage(
        msg.reduce((str, num) => `${str},${(num).toString(16)}`, ID_MIDI),
        "*"
      );
    };
  }
};
