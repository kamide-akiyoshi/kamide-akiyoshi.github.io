
const activateChordButton = (buttonCanvas, dial, onSongReady) => {
  dial.keySignatureTextAt0 = 'key/sus4';
  const keySignatureSelector = setupKeySignatureSelector();
  const searchParams = new URLSearchParams(window.location.search);
  const pianokeyboard = new PianoKeyboard(
    setupToneIndicatorCanvas(dial, keySignatureSelector),
    (key) => keySignatureSelector.parse(key),
    setupBeatCanvas(dial, keySignatureSelector)?.drawBeat,
    onSongReady,
    searchParams
  );
  const { chordView } = pianokeyboard;
  dial.chord = chordView;
  chordView.setup(dial.keySignatureSelector = keySignatureSelector);
  keySignatureSelector.onChange = () => {
    chordView.keyOrChordChanged();
    dial.draw();
  };
  (chordView.buttonCanvas = buttonCanvas).focus();
  const initialKeySig = (searchParams.get("keysig") ?? searchParams.get("key"))?.split(",", 1)[0];
  if( initialKeySig ) keySignatureSelector.parse(initialKeySig);
  const createPcKeyboardBindings = () => {
    const toLeftRightKeyCodes = (key) => ["Left", "Right"].map((lr) => `${key}${lr}`);
    const toKeyCodes = (chars) => Array.from(chars, c => `Key${c}`);
    const digitKeyCodes = Array.from({ length: 10 }, (_, d) => `Digit${d}`);
    digitKeyCodes.push(digitKeyCodes.shift());
    return [
      new Map(
        [
          [...digitKeyCodes, 'Minus', 'Equal'],
          [...toKeyCodes('QWERTYUIOP'), ...toLeftRightKeyCodes('Bracket')],
          [...toKeyCodes('ASDFGHJKL'), 'Semicolon', 'Quote', 'Backslash'],
        ].flatMap(
          (codes, row) => codes.map((code, column) => [code, [column - 5, 1 - row]])
        )
      ),
      ['Shift', 'Alt', 'Control', 'Meta'].flatMap(toLeftRightKeyCodes),
    ];
  }
  const [pcKeyBindMap, shiftLikeKeyCodes] = createPcKeyboardBindings();
  let shiftButtonStatus;
  const handleEvent = (event, chordView) => {
    switch( event.type ) {
      case 'keydown':
        if( event.repeat || ! chordView || shiftLikeKeyCodes.includes(event.code) ) {
          event.preventDefault();
          return;
        }
        if( pcKeyBindMap.has(event.code) ) {
          const { model } = chordView;
          [model.hour, model.offset3rd] = pcKeyBindMap.get(event.code);
          model.hour += keySignatureSelector.numberOfSharps;
        } else {
          switch(event.code) {
            case 'Space':
              event.preventDefault(); // To avoid unexpected page down
              // fallthrough
            case 'Enter':
              chordView.start();
              return;
            case 'Tab':
              // Move focus (Keep default action)
              return;
            case 'ArrowLeft': keySignatureSelector.numberOfSharps-- ; event.preventDefault(); return;
            case 'ArrowRight': keySignatureSelector.numberOfSharps++ ; event.preventDefault(); return;
            case 'ArrowUp': keySignatureSelector.numberOfSharps -= 5 ; event.preventDefault(); return;
            case 'ArrowDown': keySignatureSelector.numberOfSharps += 5 ; event.preventDefault(); return;
            default: event.preventDefault(); return;
          }
        }
        break;
      case 'touchmove':
      case 'mousemove':
        event.preventDefault();
        return;
      default:
        if( ! chordView ) {
          event.preventDefault();
          return;
        } else {
          const { target: canvas, clientX, clientY } = event.changedTouches?.[0] ?? event;
          const { left, right, top, bottom } = canvas.getBoundingClientRect();
          const x = ( clientX - (left + right) / 2 ) / canvas.width;
          const y = ( clientY - (top + bottom) / 2 ) / canvas.height;
          const r = Math.sqrt( x ** 2 + y ** 2 );
          const br = dial.borderRadius;
          if( r > br[3] || r < br[0] ) return;
          canvas.focus();
          const { model } = chordView;
          if( r < br[1] )
            model.setRelativeMinor();
          else if( r > br[2] )
            model.setSus4();
          else
            model.setRelativeMajor();
          model.hour = Math.round( (canvas.lastHourAngle = Math.atan2(x, -y)) * 6 / Math.PI );
          delete model.majorBassHour;
        }
        break;
    }
    const { model } = chordView;
    const relativeHour = model.hour - keySignatureSelector.numberOfSharps;
    if( relativeHour < -5 ) model.hour += 12; else if( relativeHour > 6 ) model.hour -= 12;
    model.setPerfect5();
    if( event.altKey || shiftButtonStatus?.button_flat5 ) {
      if( model.isSus4 ) {
        model.setRelativeMajor(); // Cancel sus4
        model.setAug5();
      } else {
        model.setDim5();
      }
    }
    model.offset7th = 0;
    if( shiftButtonStatus ) {
      model.offset7th = 4;
      shiftButtonStatus.button_7th && (model.offset7th -= 2);
      shiftButtonStatus.button_major7th && (model.offset7th -= 1);
    } else if( event.type === 'keydown' ) {
      event.shiftKey && (model.offset7th += 2);
      event.metaKey && (model.offset7th += 1);
    } else {
      event.button == 2 && (model.offset7th += 2);
      event.shiftKey && (model.offset7th += 1);
    }
    model.offset7th == 4 && (model.offset7th = 0);
    model.add9th = event.ctrlKey || shiftButtonStatus?.button_add9;
    chordView.start();
  };
  const isTouchDevice = typeof window.ontouchstart !== 'undefined';
  const eventTypes = {
    disable: [
      'click',
      'dblclick',
      'contextmenu',
      'selectstart',
    ],
    move: isTouchDevice ? "touchmove" : "mousemove",
    start: ['pointerdown', 'keydown'],
    end: ['pointerup', 'keyup']
  };
  const shiftButtonContainer = document.getElementById('shift_button_container');
  const shiftKeyDescription = document.getElementById('shift_key_description');
  if( isTouchDevice ) {
    shiftButtonStatus = {};
    [
      "button_7th",
      "button_major7th",
      "button_flat5",
      "button_add9"
    ].forEach(id => {
      const button = document.getElementById(id);
      if( ! button ) return;
      button.addEventListener('touchstart', event => {
        shiftButtonStatus[id] = true;
        event.changedTouches[0].target.classList.add('pressed');
      });
      button.addEventListener('touchend', event => {
        delete shiftButtonStatus[id];
        event.changedTouches[0].target.classList.remove('pressed');
      });
      [...eventTypes.disable, eventTypes.move].forEach(t => button.addEventListener(t, e => e.preventDefault()));
    });
    shiftKeyDescription?.remove();
    buttonCanvas.title = "Touch the chord symbol to sound";
  } else {
    shiftButtonContainer?.remove();
    buttonCanvas.title = "Click the chord symbol to sound";
  }
  eventTypes.disable.forEach(t => buttonCanvas.addEventListener(t, handleEvent));
  eventTypes.start.forEach(t => buttonCanvas.addEventListener(t, e => handleEvent(e, chordView)));
  eventTypes.end.forEach(t => buttonCanvas.addEventListener(t, chordView.stop));
  const handleMouseLeave = (event) => {
    event.buttons && chordView.stop();
  };
  buttonCanvas.addEventListener("mouseleave", handleMouseLeave);
  if( chordView.dialCenterLabel ) {
    const { element } = chordView.dialCenterLabel;
    element.addEventListener('pointerdown', e => {
      chordView.start();
    });
    element.addEventListener('pointerup', e => {
      buttonCanvas.focus();
      chordView.stop();
    });
    element.addEventListener('mouseleave', handleMouseLeave);
  }
  buttonCanvas.setChord = (/** @type {Music.Chord} */ chord) => {
    const context = buttonCanvas.getContext("2d");
    const { width, height } = buttonCanvas;
    context.clearRect(0, 0, width, height);
    if( !chord ) {
      return;
    }
    const { hour, offset3rd = 0 } = chord;
    const centerXY = [
      dial.center.x,
      dial.center.y,
    ];
    const [innerRadius, outerRadius] = [1, 2].map(i => dial.borderRadius[offset3rd + i] * width);
    const [startAngle, endAngle] = [3.5, 2.5].map(dh => (hour - dh) / 6 * Math.PI);
    context.beginPath();
    context.fillStyle = "#80808080";
    context.arc(...centerXY, innerRadius, startAngle, endAngle);
    context.arc(...centerXY, outerRadius, endAngle, startAngle, true);
    context.fill();
  };
  const handleMouseMove = (event) => {
    if( event.buttons === 0 ) {
      // No mouse button pressed, no strum
      return;
    }
    const {
      target: canvas,
      clientX,
      clientY,
    } = event.changedTouches?.[0] ?? event;
    const { left, right, top, bottom } = canvas.getBoundingClientRect();
    const x = ( clientX - (left + right) / 2 );
    const y = ( clientY - (top + bottom) / 2 );
    const hourAngle = Math.atan2(x, -y);
    const diffHourAngle = hourAngle - canvas.lastHourAngle;
    if( Math.abs(diffHourAngle) < Math.PI / 15 ) return;
    canvas.lastHourAngle = hourAngle;
    chordView.strum(diffHourAngle < 0 ? -1 : 1);
  };
  buttonCanvas.enableStrum = () => buttonCanvas.addEventListener(eventTypes.move, handleMouseMove);
  buttonCanvas.disableStrum = () => buttonCanvas.removeEventListener(eventTypes.move, handleMouseMove);
  if( chordView.chordTextInput ) {
    const { chordTextInput } = chordView;
    const handleEnterPress = (event) => {
      chordView.model.parseText(chordTextInput.value) || chordView.clear();
      chordView.start();
      event.preventDefault();
    };
    const handleEnterRelease = () => chordView.stop();
    chordTextInput.addEventListener('keydown', (event) => {
      if( ! event.repeat && ["Enter", " "].includes(event.key) ) handleEnterPress(event);
    });
    chordTextInput.addEventListener('keyup', (event) => {
      if( ["Enter", " "].includes(event.key) ) handleEnterRelease();
    });
    const chordEnterButton = document.getElementById('enter_chord');
    if( chordEnterButton ) {
      chordEnterButton.addEventListener('pointerdown', handleEnterPress);
      chordEnterButton.addEventListener('pointerup', handleEnterRelease);
      if( isTouchDevice ) {
        chordEnterButton.addEventListener('touchstart', handleEnterPress);
        chordEnterButton.addEventListener('touchend', handleEnterRelease);
      }
    }
  }
  chordView.clear();
};
