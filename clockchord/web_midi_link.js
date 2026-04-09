
const setupWebMidiLink = (handleMidiMessage) => {
  window.addEventListener('message', event => {
    if( ! event.data.split ) {
      // Ignore the message from the other message source (Such as Songle)
      return;
    }
    const msg = event.data.split(",");
    const msgType = msg.shift();
    switch(msgType) {
      case 'midi':
        handleMidiMessage(msg.map(hexStr => parseInt(hexStr, 16)));
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
    const send = (msg) => {
      const { contentWindow } = iFrame;
      if( !contentWindow ) return;
      const str = msg.reduce((str, num) => `${str},${(num).toString(16)}`, "midi");
      contentWindow.postMessage(str, "*");
    };
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
    return send;
  }
};
