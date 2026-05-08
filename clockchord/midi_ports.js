
/** @param {EventListenerOrEventListenerObject} midiMessageListener */
const setupMidiPorts = (midiMessageListener) => {
  const midiElement = document.getElementById('midi');
  if( ! midiElement ) return;
  if( ! window.isSecureContext ) {
    console.warn("Warning: Not in secure context - MIDI IN/OUT not allowed");
  }
  const createSelectedMidiOutputPorts = () => {
    /**
     * @type {MIDIOutput[] & {
     *  addPort: (port: MIDIOutput) => void,
     *  removePort: (port: MIDIOutput) => void,
     *  send: typeof MIDIOutput.prototype.send,
     * }}
     */
    const ports = [];
    ports.addPort = (port) => { ports.push(port); };
    ports.removePort = (port) => {
      const i = ports.findIndex(p => p.id === port.id);
      i < 0 || ports.splice(i, 1);
    };
    ports.send = (data, timestamp) => ports.forEach((port) => port.send(data, timestamp));
    return ports;
  };
  const selectedMidiOutputPorts = createSelectedMidiOutputPorts();
  /** @param {Event & { target: HTMLInputElement }} event */
  const eventToAddOrRemove = (event) => event.target.checked ? "add" : "remove";
  const checkboxes = {
    /**
     * @param {MIDIPort} port
     * @returns {HTMLInputElement | null}
     */
    get: (port) => midiElement.querySelector(`input[value="${port.id}"]`),
    /** @param {MIDIPort} port */
    add: (port) => {
      if( checkboxes.get(port) ) return;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = `midi_${port.type}`;
      cb.value = port.id;
      const label = document.createElement("label");
      label.appendChild(cb);
      const manufacturerText = port.manufacturer ? ` (${port.manufacturer})` : "";
      label.appendChild(document.createTextNode(`${port.name}${manufacturerText}`));
      document.getElementById(cb.name).appendChild(label);
      switch(port.type) {
        case "input":
          cb.addEventListener("change", event => {
            port[`${eventToAddOrRemove(event)}EventListener`]("midimessage", midiMessageListener);
          });
          break;
        case "output":
          cb.addEventListener("change", event => {
            selectedMidiOutputPorts[`${eventToAddOrRemove(event)}Port`](port);
          });
          break;
      };
    },
    /** @param {MIDIPort} port */
    remove: (port) => {
      switch(port.type) {
        case "input":
          port.removeEventListener("midimessage", midiMessageListener);
          break;
        case "output":
          selectedMidiOutputPorts.removePort(port);
          break;
      };
      checkboxes.get(port)?.closest("label").remove();
    },
  };
  navigator.requestMIDIAccess({
    sysex: true,
    software: false,
  }).then(access => {
    access.inputs.forEach(checkboxes.add);
    access.outputs.forEach(checkboxes.add);
    access.addEventListener("statechange", ({ port }) => {
      switch(port.state) {
        case "connected": // USB MIDI plugged
          checkboxes.add(port);
          break;
        case "disconnected": // USB MIDI unplugged
          checkboxes.remove(port);
          break;
      }
    });
  }).catch(msg => {
    alert(msg);
  });
  return selectedMidiOutputPorts;
};
