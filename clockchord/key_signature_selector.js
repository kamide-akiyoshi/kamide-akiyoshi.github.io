
const setupKeySignatureSelector = () => {
  const selectElement = document.getElementById('keyselect') || {};
  const minorElement = document.getElementById('minor') || {};
  const enharmonicButton = document.getElementById('enharmonic');
  const keySignatureSelector = {
    get numberOfSharps() { 
      return parseInt(selectElement.value);
    },
    set numberOfSharps(hour) {
      selectElement.value = hour = Music.normalizeHourAsKey(hour);
      if( enharmonicButton ) {
        const { style } = enharmonicButton;
        const enharmonicHour = Music.enharmonicKeyOf(hour);
        if( enharmonicHour ) {
          enharmonicButton.textContent = Music.keySignatureTextAt(this.enharmonicHour = enharmonicHour);
          style.visibility = 'visible';
        } else {
          delete this.enharmonicHour;
          style.visibility = 'hidden';
        }
      }
      this.onChange?.();
    },
    get minor() { return minorElement.checked; },
    set minor(value) {
      minorElement.checked = value;
      this.onChange?.();
    },
    parse(value) {
      if( Array.isArray(value) ) {
        const [hour, minor] = value;
        minorElement.checked = minor;
        this.numberOfSharps = hour;
        return;
      }
      if( value.hasValue ) { // Chord
        this.parse([value.hour, value.isMinor]);
        return;
      }
      if( !value.split ) return;
      const splitStrings = value.split("m", 2);
      const [root, minor] = [splitStrings[0], splitStrings.length > 1];
      let hour = parseInt(root);
      if( isNaN(hour) ) {
        const parsedRoot = Music.parsePitchName(root);
        if( !parsedRoot ) return;
        [hour] = parsedRoot; if( minor ) hour -= 3;
      }
      this.parse([hour, minor]);
    },
  };
  minorElement.addEventListener?.('change', () => keySignatureSelector.onChange?.());
  if( selectElement.addEventListener ) {
    const option0 = selectElement.querySelector("option");
    for( let hour = -7; hour <= 7; hour++ ) {
      const option = hour === 0 ? option0 : option0.cloneNode();
      option.value = hour;
      option.textContent = Music.keySignatureTextAt(hour) || Music.NATURAL;
      selectElement.appendChild(option);
    }
    option0.defaultSelected = true;
    selectElement.addEventListener('change', event => keySignatureSelector.numberOfSharps = event.target.value);
  }
  enharmonicButton?.addEventListener(
    'click', () => {
      const { enharmonicHour } = keySignatureSelector;
      if( ! enharmonicHour || keySignatureSelector.numberOfSharps === enharmonicHour ) return;
      keySignatureSelector.numberOfSharps = enharmonicHour;
    }
  );
  keySignatureSelector.numberOfSharps = 0;
  return keySignatureSelector;
};
