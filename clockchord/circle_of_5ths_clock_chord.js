
const Music = class {
  static NATURAL = '\u{266E}';
  static {
    const flatSharpPatternTree = [
      ["\u{1D12B}", "bb"], // Double flat
      ["\u{266D}", "b"], // Flat
      [],
      ["\u{266F}", "#"], // Sharp
      ["\u{1D12A}", "x", "##"], // Double sharp
    ];
    const A = 'A'.charCodeAt(0);
    this.majorPitchNameAt = (hour) => {
      const fsPatterns = flatSharpPatternTree[Math.trunc((hour + 15) / 7)];
      if( !fsPatterns ) return [];
      const fs = fsPatterns[0];
      const abc = String.fromCharCode(A + (hour + 18) * 4 % 7);
      return fs ? [abc, fs] : [abc];
    };
    const fsPatternToHour = flatSharpPatternTree.flatMap((patterns, index) => {
      const majorHourF = (index - 2) * 7 - 1;
      return patterns.map((pattern) => ([pattern, majorHourF]));
    }).sort(
      // Descending order of pattern length (longer pattern first)
      ([a], [b]) => b.length - a.length
    );
    const abciToHour = Array.from({ length: 7 }, (_, abci) => (abci + 2) * 2 % 7);
    this.parsePitchName = (text) => {
      const abcHour = abciToHour[text.substring(0, 1).toUpperCase().charCodeAt(0) - A] ?? -1;
      if( abcHour < 0 ) return undefined;
      let rest = text.substring(1);
      const majorHourF = fsPatternToHour.find(([pattern]) => {
        const found = rest.startsWith(pattern);
        if( found ) rest = rest.replace(pattern, "");
        return found;
      })?.[1] ?? -1;
      return [majorHourF + abcHour, rest];
    };
    this.keySignatureTextAt = (hour) => {
      if( ! hour ) return '';
      const n = Math.abs(hour);
      const fs = flatSharpPatternTree[2 + Math.sign(hour)][0];
      return n === 1 ? fs : `${n === 2 ? fs : n}${fs}`;
    };
  };
  static togglePitchNumberAndMajorHour = (n) => n + (n & 1) * 6;
  static enharmonicallyEquals = (hour1, hour2) => (hour1 - hour2 + 36) % 12 === 0;
  static enharmonicKeyOf = (hour) => Math.abs(hour) > 4 && hour - 12 * Math.sign(hour);
  static normalizeHourAsKey = (hour) => hour - 12 * Math.sign(hour) * Math.trunc((Math.abs(hour) + 4) / 12);
  static majorMinorTextOf = (hour = 0, minor) => {
    const textAt = (hour) => this.majorPitchNameAt(hour).join('');
    return minor ? `${textAt(hour + 3)}m` : textAt(hour);
  };
  static bpmTextOf = (bpmNumber) => `𝅘𝅥 = ${bpmNumber}`;
}

const CircleOfFifthsClock = class {
  static themeColors = {
    light: {
      foreground: 'black',
      grayoutForeground: 'gray',
      background: {
        donut: ['#99CCFF', '#FB99CC', '#FFFF99'],
        pie: ['#FB99CC', '#FFFF99', '#CCFFCC', '#99CCFF'],
      },
      hourBorder: {
        fine: 'rgb(0, 0, 0, 0.2)',
        coarse: 'rgb(0, 0, 0, 0.6)',
      },
      hand: {
        hour: 'rgba(0, 0, 0, 0.5)',
        minute: 'rgba(0, 0, 0, 0.5)',
        second: '#ff4000',
      },
      indicator: ['blue', 'firebrick', 'darkorange'],
    },
    dark: {
      foreground: '#C0C0C0',
      grayoutForeground: '#404040',
      background: {
        donut: ['#102030', '#301020', '#301800'],
        pie: ['#301020', '#301800', '#103010', '#102030'],
      },
      hourBorder: {
        fine: 'rgb(255, 255, 255, 0.2)',
        coarse: 'rgb(255, 255, 255, 0.6)',
      },
      hand: {
        hour: 'rgba(255, 255, 255, 0.25)',
        minute: 'rgba(255, 255, 255, 0.25)',
        second: '#ff4000',
      },
      indicator: ['cyan', 'lightpink', 'yellow'],
    },
  };
  dial = {
    borderRadius: [0.14, 0.29, 0.42, 0.5],
    has: r => 
      r <= this.dial.borderRadius[3] &&
      r >= this.dial.borderRadius[0],
    toOffset3rd: r =>
      r < this.dial.borderRadius[1] ? -1 : // minor
      r > this.dial.borderRadius[2] ?  1 : // sus4
      0, // Major
    keySignatureTextAt0: 'key',
    set theme(value) {
      const isDark = value === 'dark';
      [
        this.canvas.parentElement,
        this.chord?.dialCenterLabel.element,
      ].forEach((element) => {
        if( !element ) return;
        const cl = element.classList;
        isDark ? cl.add('dark') : cl.remove('dark');
      });
      this.themeColor = CircleOfFifthsClock.themeColors[value];
      this.draw();
    },
    draw: () => {
      const { dial, keySignature } = this;
      const {
        canvas,
        center,
        themeColor,
        backgroundMode,
      } = dial;
      if( !themeColor ) return;
      const { width, height } = canvas;
      const context = canvas.getContext("2d");
      const selectedKeyHour = keySignature.numberOfSharps;
      const isMinorKey = keySignature.minor;
      // Background
      const arcRadius = dial.borderRadius.map(r => r * width);
      const addCirclePath = (r, ccw) => context.arc(center.x, center.y, r, 0, 2 * Math.PI, ccw);
      if( backgroundMode === 'pie' ) {
        themeColor.background.pie.map(
          (color, index) => {
            const relativeHour = 3 * index;
            const startAngle = (selectedKeyHour + relativeHour - 4.5) * Math.PI / 6;
            return {startAngle, color};
          }
        ).forEach(
          ({startAngle, color}, index, array) => {
            const endAngle = (array[index + 1] ?? array[0]).startAngle;
            context.fillStyle = color;
            context.beginPath();
            context.arc(center.x, center.y, arcRadius[0], startAngle, endAngle);
            context.arc(center.x, center.y, arcRadius[3], endAngle, startAngle, true);
            context.fill();
          }
        );
      } else {
         themeColor.background.donut.forEach((color, i) => {
          context.fillStyle = color;
          context.beginPath();
          addCirclePath(arcRadius[i]);
          addCirclePath(arcRadius[i + 1], true);
          context.fill();
        });
      }
      // Donut border
      context.strokeStyle = themeColor.hourBorder.fine;
      arcRadius.forEach(r => {
        context.beginPath();
        addCirclePath(r);
        context.stroke();
      });
      // Foreground
      const isKeyOf = (h, minor) => h === 0 && (minor === undefined || isMinorKey === undefined || minor === isMinorKey);
      const textColorAt = (h, minor) =>
        isKeyOf(h, minor) ? themeColor.indicator[1] : h < -5 || h > 6 ? themeColor.grayoutForeground : themeColor.foreground;
      const sizeToFont = (sz, weight) => (weight||'normal')+' '+(sz * Math.min(width, height)/400)+'px san-serif';
      const fontWeightAt = (h, minor) => isKeyOf(h, minor) ? 'bold' : 'normal';
      context.textAlign = "center";
      context.textBaseline = "middle";
      const rDot = width / 120;
      const rSmallDot = width / 200;
      for( let hour = -5; hour <= 6; hour++ ) {
        const t = hour * Math.PI / 6;
        const x = center.dx(t);
        const y = center.dy(t);
        const relativeHour = hour - selectedKeyHour;
        // Hour-border
        let tt = t + Math.PI / 12;
        let xx = center.dx(tt);
        let yy = center.dy(tt);
        let r0 = dial.borderRadius[0];
        let r1 = dial.borderRadius[3];
        context.strokeStyle = themeColor.hourBorder[(relativeHour + 24) % 3 == 1 ? 'coarse' : 'fine'];
        context.beginPath();
        context.moveTo( center.x + r0*xx, center.y + r0*yy );
        context.lineTo( center.x + r1*xx, center.y + r1*yy );
        context.stroke();
        // Dot
        context.fillStyle = themeColor.grayoutForeground;
        r0 = dial.borderRadius[2];
        xx = x; yy = y;
        for( let i = 0; i < 5; i++ ) {
          if( i ) {
            tt = t + i * Math.PI / 30;
            xx = center.dx(tt);
            yy = center.dy(tt);
          }
          context.beginPath();
          context.arc( center.x + r0*xx, center.y + r0*yy, i ? rSmallDot : rDot, 0, 2 * Math.PI );
          context.fill();
        }
        // Text
        const drawText = (text, r) => context.fillText(text, center.x + r*x, center.y + r*y);
        const keySignatureText = hour ? Music.keySignatureTextAt(hour) : dial.keySignatureTextAt0 ;
        const majorText = Music.majorMinorTextOf(hour);
        const minorText = Music.majorMinorTextOf(hour, true);
        context.fillStyle = textColorAt(relativeHour);
        context.font = sizeToFont(11, fontWeightAt(relativeHour));
        const enharmonicHour = Music.enharmonicKeyOf(hour);
        if( enharmonicHour ) {
          drawText(keySignatureText, 0.48);
          context.fillStyle = textColorAt(relativeHour, false);
          context.font = sizeToFont(14, fontWeightAt(relativeHour, false));
          drawText(majorText, 0.38);
          context.fillStyle = textColorAt(relativeHour, true);
          context.font = sizeToFont(14, fontWeightAt(relativeHour, true));
          drawText(minorText, 0.25);
          const enharmonicRelativeHour = enharmonicHour - selectedKeyHour;
          context.fillStyle = textColorAt(enharmonicRelativeHour);
          context.font = sizeToFont(11, fontWeightAt(enharmonicRelativeHour));
          drawText(Music.keySignatureTextAt(enharmonicHour), 0.45);
          context.fillStyle = textColorAt(enharmonicRelativeHour, false);
          context.font = sizeToFont(14, fontWeightAt(enharmonicRelativeHour, false));
          drawText(Music.majorMinorTextOf(enharmonicHour), 0.33);
          context.fillStyle = textColorAt(enharmonicRelativeHour, true);
          context.font = sizeToFont(14, fontWeightAt(enharmonicRelativeHour, true));
          drawText(Music.majorMinorTextOf(enharmonicHour, true), 0.19);
        } else {
          drawText(keySignatureText, 0.465);
          if( Math.abs(relativeHour) > 4 ) {
            context.font = sizeToFont(14);
            drawText(majorText, 0.38);
            drawText(minorText, 0.25);
            const enharmonicHour = hour - 12 * Math.sign(relativeHour);
            const enharmonicRelativeHour = enharmonicHour - selectedKeyHour;
            context.fillStyle = textColorAt(enharmonicRelativeHour);
            drawText(Music.majorMinorTextOf(enharmonicHour), 0.33);
            drawText(Music.majorMinorTextOf(enharmonicHour, true), 0.19);
          } else {
            context.fillStyle = textColorAt(relativeHour, false);
            context.font = sizeToFont(19, fontWeightAt(relativeHour, false));
            drawText(majorText, 0.36);
            context.fillStyle = textColorAt(relativeHour, true);
            context.font = sizeToFont(19, fontWeightAt(relativeHour, true));
            drawText(minorText, 0.22);
          }
        }
      }
    }
  };
  hands = {
    parameter: {
      hour: {
        getValueAt: time => time.getHours(), valuePerTurn: 12,
        length: 0.25, width: 1/40, colorKey: "hour",
      },
      minute: {
        getValueAt: time => time.getMinutes(), valuePerTurn: 60,
        length: 0.4, width: 7/400, colorKey: "minute",
      },
      second: {
        getValueAt: time => time.getSeconds(), valuePerTurn: 60,
        length: 0.45, width: 1/400, colorKey: "second",
        tail: {length: -0.12, width: 3/400}, center: {radius: 7/400}
      },
    },
    clear() {
      const { canvas, offscreenDialCanvas: dial } = this;
      const { width, height } = canvas;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      dial && context.drawImage(dial, 0, 0);
      return context;
    },
    draw: () => {
      const { hands, dial } = this;
      const { center } = hands;
      const { width } = dial.canvas;
      const drawHand = (context, hand) => {
        const color = dial.themeColor.hand[hand.colorKey];
        context.beginPath();
        context.moveTo( center.x, center.y );
        context.lineWidth = hand.width * width;
        context.lineCap = 'round';
        context.lineTo( center.x + hand.x, center.y + hand.y );
        context.strokeStyle = color;
        context.stroke();
        hand.tail && drawHand(context, hand.tail);
        if( hand.center ) {
          context.beginPath();
          context.arc(center.x, center.y, hand.center.radius * width, 0, 2 * Math.PI);
          context.fillStyle = color;
          context.fill();
        }
        return context;
      };
      const { hour, minute, second } = hands.parameter;
      [hour, minute, second].reduce(drawHand, hands.clear());
    },
    set time(time) {
      const {
        center,
        parameter: { hour, minute, second },
        draw,
      } = this;
      this._time = time;
      [second, minute, hour].reduce((fraction, hand) => {
        const turn = (hand.getValueAt(time) + fraction) / hand.valuePerTurn;
        const t = 2 * Math.PI * turn;
        const x = center.dx(t);
        const y = center.dy(t);
        hand.x = hand.length * x;
        hand.y = hand.length * y;
        if( hand.tail ) {
          hand.tail.x = hand.tail.length * x;
          hand.tail.y = hand.tail.length * y;
        }
        return turn;
      }, 0);
      draw();
    },
    get time() { return this._time; },
    set moving(flag) {
      if( ! flag ) {
        clearInterval(this.intervalId);
        this.intervalId = this._isMoving = undefined;
        return;
      }
      if( this._isMoving ) return;
      this._isMoving = true;
      this.time = new Date();
      setTimeout(
        () => {
          this.intervalId = setInterval( () => this.time = new Date(), 1000 );
          this.time = new Date();
        },
        1000 - (new Date()).getMilliseconds()
      );
    },
    get moving() { return this._isMoving; }
  };
  keySignature = {
    setup(chord, dial) {
      this.chord = chord;
      const draw = this.draw = () => {
        chord.keyOrChordChanged();
        dial.draw();
      }
      const selectElement = this.selectElement = document.getElementById('keyselect') || {};
      if( selectElement.addEventListener ) {
        const option0 = selectElement.querySelector("option");
        for( let hour = -7; hour <= 7; hour++ ) {
          const option = hour === 0 ? option0 : option0.cloneNode();
          option.value = hour;
          option.textContent = Music.keySignatureTextAt(hour) || Music.NATURAL;
          selectElement.appendChild(option);
        }
        option0.defaultSelected = true;
        selectElement.addEventListener('change', event => this.numberOfSharps = event.target.value);
        (this.enharmonicButton = document.getElementById('enharmonic'))?.addEventListener(
          'click', event => {
            const { enharmonicHour } = this;
            if( ! enharmonicHour || this.numberOfSharps === enharmonicHour ) return;
            this.numberOfSharps = enharmonicHour;
          }
        );
      }
      (this.minorElement = document.getElementById('minor') || {}).addEventListener?.('change', draw);
      this.numberOfSharps = 0;
    },
    get numberOfSharps() { return parseInt(this.selectElement?.value); },
    set numberOfSharps(hour) {
      const { selectElement, enharmonicButton, draw } = this;
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
      draw();
    },
    get minor() { return this.minorElement?.checked; },
    set minor(isMinor) {
      this.minorElement.checked = isMinor;
      this.draw();
    },
    parse(value) {
      if( Array.isArray(value) ) {
        const [hour, minor] = value;
        this.minorElement.checked = minor; // Without this.draw()
        this.numberOfSharps = hour; // With this.draw()
        return;
      }
      if( value === this.chord ) {
        if( value.hasValue ) this.parse([value.hour, value.isMinor]);
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
  setupToneIndicatorCanvas = (dial, keySignature) => {
    const canvas = document.getElementById('circleOfFifthsClockToneIndicatorCanvas');
    const BASS_MAX_NOTE_NUMBER = 48;
    const { width, height } = canvas;
    const { center, borderRadius } = dial;
    const toneIndicating = Array.from({ length: 12 }, () => 0);
    const bassToneIndicating = [...toneIndicating];
    const getColorOf = (hour, flatThreshold) => {
      let offset = hour - keySignature?.numberOfSharps + 1; // min:-6, max:19 (when hour:0...11, keySignature:-7...7)
      if( offset < 0 ) offset += 12; else if ( offset >= 12 ) offset -= 12;
      return dial.themeColor.indicator[offset < 7 ? 1 : offset < flatThreshold ? 2 : 0];
    };
    const majorDirections = toneIndicating.map((_, hour) => {
      const diffToAngle = (diff = 0) => (hour + diff) * Math.PI / 6;
      const rootClockAngle = diffToAngle(-0.5);
      const centerClockAngle = diffToAngle();
      return {
        dx: center.dx(rootClockAngle),
        dy: center.dy(rootClockAngle),
        center: {
          dx: center.dx(centerClockAngle),
          dy: center.dy(centerClockAngle),
        },
        arc: {
          angle : diffToAngle(-3.5),
          bassAngles: [diffToAngle(-3.25), diffToAngle(-2.75)],
        },
      };
    });
    const context = canvas.getContext("2d");
    // Primitive drawers
    const drawRadial = (direction, startRadius, endRadius) => {
      context.beginPath();
      context.moveTo(
        center.x + startRadius * direction.dx,
        center.y + startRadius * direction.dy
      );
      context.lineTo(
        center.x + endRadius * direction.dx,
        center.y + endRadius * direction.dy
      );
      context.stroke();
    };
    const drawArc = (radius, ...angles) => {
      context.beginPath();
      context.arc(
        center.x,
        center.y,
        radius * width,
        ...angles
      );
      context.stroke();
    }
    // For best performance, Pre-calculate frequently accessed radiuses
    const average2 = (a, b) => (a + b) / 2;
    const radiusOf = (rs, n) => rs[0] + (rs[1] - rs[0]) / n;
    const shortRadiusesOf = (rs) => [rs[0], radiusOf(rs, 4)];
    //minor
    const minorRadiuses = borderRadius.slice(0, 2);
    const minorShortRadiuses = shortRadiusesOf(minorRadiuses);
    const minorCenterRadius = minorRadiuses.reduce(average2);
    const minorBassRadius = radiusOf(minorRadiuses, 5);
    // major
    const majorRadiuses = borderRadius.slice(1, 3);
    const majorShortRadiuses = shortRadiusesOf(majorRadiuses);
    const majorBassRadius = radiusOf(majorRadiuses, 5);
    // sus4
    const sus4Radiuses = [borderRadius[2], borderRadius[3] - 0.005];
    const sus4CenterRadius = sus4Radiuses.reduce(average2);
    // drawers
    const drawSus4 = (dir, fifthDir, rootColor, sus4Color, fifthColor) => {
      const angles = [dir.arc.angle, fifthDir.arc.angle];
      context.strokeStyle = rootColor; drawArc(sus4Radiuses[0], ...angles);
      drawRadial(dir, ...sus4Radiuses);
      context.strokeStyle = sus4Color; drawArc(sus4Radiuses[1], ...angles);
      context.strokeStyle = fifthColor; drawRadial(fifthDir, ...sus4Radiuses);
    };
    const drawAug = (startDir, endDir) => {
      drawRadial(startDir.center, ...sus4Radiuses);
      drawArc(sus4CenterRadius, startDir.arc.angle, endDir.arc.angle);
    };
    const tritoneArcArgs = [0.03 * width, 0, 2 * Math.PI];
    const drawTritone = (hour) => {
      const direction = majorDirections[hour].center;
      context.beginPath();
      context.arc(
        center.x + minorCenterRadius * direction.dx,
        center.y + minorCenterRadius * direction.dy,
        ...tritoneArcArgs
      );
      context.stroke();
    };
    const draw = (hour) => {
      const hour1ccw = hour ? hour - 1 : 11;
      const hour2ccw = hour + (hour < 2 ? 10 : -2);
      const hour3ccw = hour + (hour < 3 ? 9 : -3);
      const hour4ccw = hour + (hour < 4 ? 8 : -4);
      const hour6 = hour + (hour < 6 ? 6 : -6);
      const hour4 = hour + (hour < 8 ? 4 : -8);
      const hour3 = hour + (hour < 9 ? 3 : -9);
      const hour1 = hour < 11 ? hour + 1 : 0;
      context.lineWidth = 3;
      context.strokeStyle = getColorOf(hour, 8);
      drawRadial(majorDirections[hour], ...majorRadiuses);
      if( toneIndicating[hour4] ) {
        const directions = [
          majorDirections[hour],
          majorDirections[hour1],
        ];
        const arcAngles = directions.map(d => d.arc.angle);
        if( toneIndicating[hour1] ) { // root:hour + major3rd:hour4 + 5th:hour1 = major chord
          drawArc(borderRadius[2], ...arcAngles);
        }
        if( toneIndicating[hour3] ) { // root:hour3 + minor3rd:hour + 5th:hour4 = minor chord
          drawArc(borderRadius[0], ...arcAngles);
        }
        context.strokeStyle = getColorOf(hour4, 11); drawArc(borderRadius[1], ...arcAngles);
        if( toneIndicating[hour4ccw] ) { // Augumented chords
          const hour5 = hour + (hour < 7 ? 5 : -7);
          // Augumented 5th (#5th, 8 hours CW / 4 hours CCW) color
          context.strokeStyle = getColorOf(hour4ccw, 12); drawAug(...directions);
          context.strokeStyle = getColorOf(hour,     12); drawAug(majorDirections[hour4], majorDirections[hour5]);
          context.strokeStyle = getColorOf(hour4,    12); drawAug(majorDirections[hour4ccw], majorDirections[hour3ccw]);
        }
      }
      context.strokeStyle = getColorOf(hour, 11);
      drawRadial(majorDirections[hour3ccw], ...minorRadiuses);
      if( toneIndicating[hour4ccw] ) {
        const arcAngles = [
          majorDirections[hour4ccw].arc.angle,
          majorDirections[hour3ccw].arc.angle,
        ];
        drawArc(borderRadius[1], ...arcAngles);
        if( toneIndicating[hour3ccw] ) { // root:hour4ccw + major3rd:hour + 5th:hour3ccw = major chord
          context.strokeStyle = getColorOf(hour4ccw, 8); drawArc(borderRadius[2], ...arcAngles);
        }
        if( toneIndicating[hour1ccw] ) { // root:hour1ccw + minor3rd:hour4ccw + 5th:hour = minor chord
          context.strokeStyle = getColorOf(hour4ccw, 8); drawArc(borderRadius[0], ...arcAngles);
        }
      }
      context.strokeStyle = getColorOf(hour1, 11); drawRadial(majorDirections[hour2ccw], ...minorShortRadiuses);
      context.strokeStyle = getColorOf(hour1, 8); drawRadial(majorDirections[hour1], ...majorShortRadiuses);
      if( toneIndicating[hour1] ) {
        if( toneIndicating[hour3ccw] ) { // root:hour + minor3rd:hour3ccw + 5th:hour1 = minor chord
          context.strokeStyle = getColorOf(hour3ccw, 8);
          drawArc(
            borderRadius[0],
            majorDirections[hour3ccw].arc.angle,
            majorDirections[hour2ccw].arc.angle
          );
        }
        if( toneIndicating[hour1ccw] ) { // root:hour + sus4:hour1ccw + 5th:hour1 = sus4 chord
          drawSus4(
            majorDirections[hour],
            majorDirections[hour1],
            getColorOf(hour, 8),
            getColorOf(hour1ccw, 7),
            getColorOf(hour1, 8)
          );
        }
        const hour2 = hour + (hour < 10 ? 2 : -10);
        if( toneIndicating[hour2] ) { // root:hour1 + sus4:hour + 5th:hour2 = sus4 chord
          drawSus4(
            majorDirections[hour1],
            majorDirections[hour2],
            getColorOf(hour1, 8),
            getColorOf(hour, 7),
            getColorOf(hour2, 8)
          );
        }
      }
      if( toneIndicating[hour1ccw] ) {
        if( toneIndicating[hour3] ) { // root:hour1ccw + major3rd:hour3 + 5th:hour = major chord
          context.strokeStyle = getColorOf(hour1ccw, 8);
          drawArc(
            borderRadius[2],
            majorDirections[hour1ccw].arc.angle,
            majorDirections[hour].arc.angle
          );
        }
        if( toneIndicating[hour2ccw] ) { // root:hour1ccw + sus4:hour2ccw + 5th:hour = sus4 chord
          drawSus4(
            majorDirections[hour1ccw],
            majorDirections[hour],
            getColorOf(hour1ccw, 8),
            getColorOf(hour2ccw, 7),
            getColorOf(hour, 8)
          );
        }
      }
      if( toneIndicating[hour6] ) { // Tritone
        // Diminished 5th (b5th, 6 hour CW/CCW) color
        context.strokeStyle = getColorOf(hour6, 7); drawTritone(hour3ccw);
        context.strokeStyle = getColorOf(hour,  7); drawTritone(hour3);
      }
    };
    const drawBass = (hour) => {
      const hour3ccw = hour + (hour < 3 ? 9 : -3);
      context.lineWidth = 7;
      context.strokeStyle = getColorOf(hour, 8);  drawArc(majorBassRadius, ...majorDirections[hour].arc.bassAngles);
      context.strokeStyle = getColorOf(hour, 11); drawArc(minorBassRadius, ...majorDirections[hour3ccw].arc.bassAngles);
    };
    const redrawAll = () => {
      context.clearRect(0, 0, width, height);
      toneIndicating.forEach((weight, hour) => weight && draw(hour));
      bassToneIndicating.forEach((weight, hour) => weight && drawBass(hour));
    }
    canvas.noteOn = (noteNumber) => {
      const bass = noteNumber <= BASS_MAX_NOTE_NUMBER;
      const majorHour = Music.togglePitchNumberAndMajorHour(noteNumber) % 12;
      if( toneIndicating[majorHour]++ === 0 ) {
        draw(majorHour);
      }
      if( bass && bassToneIndicating[majorHour]++ === 0 ) {
        drawBass(majorHour);
      }
    };
    canvas.noteOff = (noteNumber) => {
      const bass = noteNumber <= BASS_MAX_NOTE_NUMBER;
      const hour = Music.togglePitchNumberAndMajorHour(noteNumber) % 12;
      let redrawRequired;
      if( --toneIndicating[hour] <= 0) {
        toneIndicating[hour] = 0;
        redrawRequired = true;
      }
      if( bass && --bassToneIndicating[hour] <= 0 ) {
        bassToneIndicating[hour] = 0;
        redrawRequired = true;
      }
      redrawRequired && redrawAll();
    };
    canvas.allSoundOff = () => {
      toneIndicating.fill(0);
      bassToneIndicating.fill(0);
      redrawAll();
    };
    return canvas;
  };
  setupBeatCanvas = (dial, keySignature) => {
    const beatCanvas = document.getElementById("circleOfFifthsClockBeatCanvas");
    const radianPerHour = Math.PI / 6;
    const context = beatCanvas.getContext("2d");
    const { center, canvas: { width, height } } = dial;
    const cxy = [center.x, center.y];
    beatCanvas.drawBeat = (beat, numerator) => {
      context.clearRect(0, 0, width, height);
      if( beat === undefined ) return;
      const ratio = numerator - beat < 2 ? 0 : 1 / (2 ** beat);
      const outer = dial.borderRadius[keySignature.minor ? 1 : 2];
      const inner = outer - ratio * (outer - dial.borderRadius[keySignature.minor ? 0 : 1]);
      const startAngle = (keySignature.numberOfSharps - 3.5) * radianPerHour;
      const endAngle = startAngle + radianPerHour;
      context.fillStyle = `color-mix(in srgb, ${dial.themeColor.indicator[1]} 15%, transparent)`;
      context.beginPath();
      context.arc(...cxy, inner * width, startAngle, endAngle);
      context.arc(...cxy, outer * width, endAngle, startAngle, true);
      context.fill();
    };
    return beatCanvas;
  };
  constructor() {
    const loader = () => {
      const canvasId = 'circleOfFifthsClockCanvas';
      const canvas = document.getElementById(canvasId);
      if( ! canvas ) {
        console.error(`${canvasId}: No such element ID`);
        return;
      }
      const { hands, dial } = this;
      const { width, height } = hands.canvas = canvas;
      hands.center = dial.center = {
        x: width/2,
        y: height/2,
        dx: t =>  width  * Math.sin(t),
        dy: t => -height * Math.cos(t),
      };
      dial.canvas = document.getElementById('circleOfFifthsClockDialCanvas');
      if( ! dial.canvas ) {
        const osdc = hands.offscreenDialCanvas = dial.canvas = document.createElement('canvas');
        osdc.width = width;
        osdc.height = height;
      }
      const redrawTheme = (theme) => {
        dial.theme = theme;
        hands.draw();
      };
      const redrawBackgroundMode = (mode) => {
        dial.backgroundMode = mode;
        dial.draw();
      };
      const darkModeSelect = document.getElementById('theme_select');
      if( darkModeSelect ) {
        Object.defineProperty(darkModeSelect, 'value', {
          set: (value) => {
            darkModeSelect.querySelector(`input[value="${value}"]:not(:checked)`)?.click();
          },
          get: () => darkModeSelect.querySelector('input:checked')?.value,
        });
        // Let the darkModeSelect (<div> element) detect the change event bubbled from child radio button
        darkModeSelect.addEventListener('change', (event) => redrawTheme(event.target.value));
      }
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const setSystemTheme = () => {
        const systemTheme = darkModeMediaQuery.matches ? 'dark' : 'light';
        darkModeSelect && (darkModeSelect.value = systemTheme);
        redrawTheme(systemTheme);
      };
      darkModeMediaQuery.addEventListener('change', setSystemTheme);
      const backgroundModeSelect = document.getElementById('background_mode_select');
      if( backgroundModeSelect ) {
        dial.backgroundModeSelect = backgroundModeSelect;
        Object.defineProperty(backgroundModeSelect, 'value', {
          set: (value) => {
            backgroundModeSelect.querySelector(`input[value="${value}"]:not(:checked)`)?.click();
          },
          get: () => backgroundModeSelect.querySelector('input:checked')?.value,
        });
        backgroundModeSelect.addEventListener('change', e => redrawBackgroundMode(e.target.value));
        dial.backgroundMode = backgroundModeSelect.value;
      } else {
        dial.backgroundMode = "donut";
      }
      if( darkModeSelect || backgroundModeSelect ) {
        // Restore the currently selected theme display when page back
        window.addEventListener("pageshow", () => {
          darkModeSelect && redrawTheme(darkModeSelect.value);
          backgroundModeSelect && redrawBackgroundMode(backgroundModeSelect.value);
        });
      }
      this.setDarkPlayMode = () => {
        darkModeSelect.value = "dark";
        backgroundModeSelect.value = "pie";
      };
      const chordButtonCanvas = document.getElementById('circleOfFifthsClockChordButtonCanvas');
      chordButtonCanvas && this.listen(chordButtonCanvas);
      setSystemTheme();
      hands.moving = true;
    }
    window.addEventListener("load", loader);
  };
  listen = (buttonCanvas) => {
    if( this.pianokeyboard ) {
      console.warn('CircleOfFifthsClock: listen(): Already listening');
      return;
    }
    const { keySignature, dial } = this;
    const searchParams = new URLSearchParams(window.location.search);
    const { chord } = this.pianokeyboard = new PianoKeyboard(
      this.setupToneIndicatorCanvas(dial, keySignature),
      this.setupBeatCanvas(dial, keySignature),
      this.setDarkPlayMode,
      searchParams
    );
    buttonCanvas.focus();
    chord.keySignature = keySignature;
    chord.buttonCanvas = buttonCanvas;
    dial.chord = chord;
    dial.keySignatureTextAt0 = 'key/sus4';
    keySignature.setup(chord, dial);
    const initialKeySig = (searchParams.get("keysig") ?? searchParams.get("key"))?.split(",", 1)[0];
    if( initialKeySig ) keySignature.parse(initialKeySig);
    //
    // PC keyboard bindings
    const createLeftRightKeyCodes = (key) => ["Left", "Right"].map((lr) => `${key}${lr}`);
    const createKeyCodes = (arrayLike) => Array.from(arrayLike, c => `Key${c}`);
    const createDigitKeyCodes = () => {
      const keyCodes = Array.from({ length: 10 }, (_, d) => `Digit${d}`);
      keyCodes.push(keyCodes.shift());
      return keyCodes;
    };
    const pcKeyBindMap = new Map(
      [
        [...createDigitKeyCodes(), 'Minus', 'Equal'],
        [...createKeyCodes('QWERTYUIOP'), ...createLeftRightKeyCodes('Bracket')],
        [...createKeyCodes('ASDFGHJKL'), 'Semicolon', 'Quote', 'Backslash'],
      ].flatMap(
        (row, y) => row.map((code, x) => [code, [x-5, 1-y]])
      )
    );
    const shiftLikeKeyCodes = ['Shift', 'Alt', 'Control', 'Meta'].flatMap(createLeftRightKeyCodes);
    const handleEvent = (event, chord) => {
      switch( event.type ) {
        case 'keydown':
          if( event.repeat || ! chord || shiftLikeKeyCodes.includes(event.code) ) {
            event.preventDefault();
            return;
          }
          if( pcKeyBindMap.has(event.code) ) {
            [chord.hour, chord.offset3rd] = pcKeyBindMap.get(event.code);
            chord.hour += keySignature.numberOfSharps;
          } else {
            switch(event.code) {
              case 'Space':
                event.preventDefault(); // To avoid unexpected page down
                // fallthrough
              case 'Enter':
                chord.start();
                return;
              case 'Tab':
                // Move focus (Keep default action)
                return;
              case 'ArrowLeft': keySignature.numberOfSharps-- ; event.preventDefault(); return;
              case 'ArrowRight': keySignature.numberOfSharps++ ; event.preventDefault(); return;
              case 'ArrowUp': keySignature.numberOfSharps -= 5 ; event.preventDefault(); return;
              case 'ArrowDown': keySignature.numberOfSharps += 5 ; event.preventDefault(); return;
              default: event.preventDefault(); return;
            }
          }
          break;
        case 'touchmove':
        case 'mousemove':
          event.preventDefault();
          return;
        default:
          if( ! chord ) {
            event.preventDefault();
            return;
          } else {
            const { target: canvas, clientX, clientY } = event.changedTouches?.[0] ?? event;
            const { left, right, top, bottom } = canvas.getBoundingClientRect();
            const x = ( clientX - (left + right) / 2 ) / canvas.width;
            const y = ( clientY - (top + bottom) / 2 ) / canvas.height;
            const r = Math.sqrt( x ** 2 + y ** 2 );
            if( ! dial.has(r) ) return;
            canvas.focus();
            chord.offset3rd = dial.toOffset3rd(r);
            chord.hour = Math.round( (canvas.lastHourAngle = Math.atan2(x, -y)) * 6 / Math.PI );
            delete chord.majorBassHour;
          }
          break;
      }
      const relativeHour = chord.hour - keySignature.numberOfSharps;
      if( relativeHour < -5 ) chord.hour += 12; else if( relativeHour > 6 ) chord.hour -= 12;
      chord.offset5th = 0;
      const { shiftButtonStatus } = this;
      if( event.altKey || shiftButtonStatus?.button_flat5 ) {
        if( chord.isSus4 ) {
          chord.offset3rd = 0; chord.offset5th = 1; // replace sus4 to augumented
        } else {
          chord.offset5th = -1; // -5
        }
      }
      chord.offset7th = 0;
      if( shiftButtonStatus ) {
        chord.offset7th = 4;
        shiftButtonStatus.button_7th && (chord.offset7th -= 2);
        shiftButtonStatus.button_major7th && (chord.offset7th -= 1);
      } else if( event.type === 'keydown' ) {
        event.shiftKey && (chord.offset7th += 2);
        event.metaKey && (chord.offset7th += 1);
      } else {
        event.button == 2 && (chord.offset7th += 2);
        event.shiftKey && (chord.offset7th += 1);
      }
      chord.offset7th == 4 && (chord.offset7th = 0);
      chord.add9th = event.ctrlKey || shiftButtonStatus?.button_add9;
      chord.start();
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
      const status = this.shiftButtonStatus = {};
      [
        "button_7th",
        "button_major7th",
        "button_flat5",
        "button_add9"
      ].forEach(id => {
        const button = document.getElementById(id);
        if( ! button ) return;
        button.addEventListener('touchstart', event => {
          status[id] = true;
          event.changedTouches[0].target.classList.add('pressed');
        });
        button.addEventListener('touchend', event => {
          delete status[id];
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
    eventTypes.start.forEach(t => buttonCanvas.addEventListener(t, e => handleEvent(e, chord)));
    eventTypes.end.forEach(t => buttonCanvas.addEventListener(t, chord.stop));
    const handleMouseLeave = (event) => {
      event.buttons && chord.stop();
    };
    buttonCanvas.addEventListener("mouseleave", handleMouseLeave);
    if( chord.dialCenterLabel ) {
      const { element } = chord.dialCenterLabel;
      element.addEventListener('pointerdown', e => {
        chord.start();
      });
      element.addEventListener('pointerup', e => {
        buttonCanvas.focus();
        chord.stop();
      });
      element.addEventListener('mouseleave', handleMouseLeave);
    }
    buttonCanvas.setChord = (chord) => {
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
      chord.strum(diffHourAngle < 0 ? -1 : 1);
    };
    buttonCanvas.enableStrum = () => buttonCanvas.addEventListener(eventTypes.move, handleMouseMove);
    buttonCanvas.disableStrum = () => buttonCanvas.removeEventListener(eventTypes.move, handleMouseMove);
    if( chord.chordTextInput ) {
      const { chordTextInput } = chord;
      const handleEnterPress = (event) => {
        chord.parseText(chordTextInput.value);
        chord.start();
        event.preventDefault();
      };
      const handleEnterRelease = () => chord.stop();
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
    chord.clear();
  };
};

