// @ts-check
/**
 * @param {EventListenerOrEventListenerObject} midiMessageListener
 */
const setupMidiPorts = (midiMessageListener) => {
  const midiPortsElement = document.getElementById('midi_ports');
  if( ! midiPortsElement ) return;
  if( ! window.isSecureContext ) {
    console.warn("Warning: Not in secure context - MIDI IN/OUT not allowed");
  }
  /**
   * @type {(port: MIDIPort) => port is MIDIInput}
   */
  const isMIDIInput = (port) => port.type === "input";
  /**
   * @type {(port: MIDIPort) => port is MIDIOutput}
   */
  const isMIDIOutput = (port) => port.type === "output";
  /**
   * @type {MIDIOutput[]}
   */
  const selectedMidiOutputPorts = [];
  /**
   * @param {MIDIOutput} port
   */
  const removeOutputPort = (port) => {
    const i = selectedMidiOutputPorts.findIndex(p => p.id === port.id);
    i < 0 || selectedMidiOutputPorts.splice(i, 1);
  };
  const checkboxes = {
    /** @type {(port: MIDIPort) => HTMLInputElement | null} */
    get: (port) => midiPortsElement.querySelector(`input[value="${port.id}"]`),
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
      document.getElementById(cb.name)?.appendChild(label);
      if( isMIDIInput(port) ) {
        cb.addEventListener("change", () => {
          cb.checked ?
            port.addEventListener("midimessage", midiMessageListener) :
            port.removeEventListener("midimessage", midiMessageListener);
        });
      } else if( isMIDIOutput(port) ) {
        cb.addEventListener("change", () => {
          cb.checked ? selectedMidiOutputPorts.push(port) : removeOutputPort(port);
        });
      }
    },
    /** @param {MIDIPort} port */
    remove: (port) => {
      if( isMIDIInput(port) ) {
          port.removeEventListener("midimessage", midiMessageListener);
      } else if( isMIDIOutput(port) ) {
          removeOutputPort(port);
      };
      checkboxes.get(port)?.closest("label")?.remove();
    },
  };
  navigator.requestMIDIAccess({
    sysex: true,
    software: false,
  }).then(access => {
    access.inputs.forEach(checkboxes.add);
    access.outputs.forEach(checkboxes.add);
    access.addEventListener("statechange", ({ port }) => {
      switch(port?.state) {
        case "connected": // USB MIDI plugged
          checkboxes.add(port);
          break;
        case "disconnected": // USB MIDI unplugged
          checkboxes.remove(port);
          break;
      }
    });
    midiPortsElement.removeAttribute("style"); // Remove style="display: none;" to show MIDI ports section
    midiPortsElement.previousElementSibling?.removeAttribute("style"); // Remove style="display: none;" of the previous <hr> element
  }).catch(msg => {
    alert(msg);
  });
  return selectedMidiOutputPorts;
};
