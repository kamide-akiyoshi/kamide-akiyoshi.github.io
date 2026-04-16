
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
    keySignatureTextAt0: 'key',
    borderRadius: [0.14, 0.29, 0.42, 0.5],
    set theme(value) {
      const addOrRemove = value === 'dark' ? 'add' : 'remove';
      [
        this.canvas.parentElement,
        this.chord?.dialCenterLabel.element,
      ].forEach((element) => element?.classList[addOrRemove]('dark'));
      this.themeColor = CircleOfFifthsClock.themeColors[value];
      this.draw();
    },
    set backgroundMode(value) {
      if( value === 'pie' ) this.isPieMode = true; else delete this.isPieMode;
      this.draw();
    },
    draw() {
      const { themeColor } = this;
      if( !themeColor ) return;
      const {
        canvas,
        center,
        borderRadius,
        isPieMode,
        keySignatureSelector,
        keySignatureTextAt0,
      } = this;
      const { width, height } = canvas;
      const context = canvas.getContext("2d");
      const selectedKeyHour = keySignatureSelector?.numberOfSharps;
      const isMinorKey = keySignatureSelector?.minor;
      // Background
      const arcRadius = borderRadius.map(r => r * width);
      const addCirclePath = (r, ccw) => context.arc(center.x, center.y, r, 0, 2 * Math.PI, ccw);
      if( isPieMode ) {
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
        let r0 = borderRadius[0];
        let r1 = borderRadius[3];
        context.strokeStyle = themeColor.hourBorder[(relativeHour + 24) % 3 == 1 ? 'coarse' : 'fine'];
        context.beginPath();
        context.moveTo( center.x + r0*xx, center.y + r0*yy );
        context.lineTo( center.x + r1*xx, center.y + r1*yy );
        context.stroke();
        // Dot
        context.fillStyle = themeColor.grayoutForeground;
        r0 = borderRadius[2];
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
        const keySignatureText = hour ? Music.keySignatureTextAt(hour) : keySignatureTextAt0 ;
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
      const darkModeSelect = document.getElementById('theme_select');
      if( darkModeSelect ) {
        Object.defineProperty(darkModeSelect, 'value', {
          set: (value) => {
            darkModeSelect.querySelector(`input[value="${value}"]:not(:checked)`)?.click();
          },
          get: () => darkModeSelect.querySelector('input:checked')?.value,
        });
        darkModeSelect.addEventListener('change', (event) => {
          dial.theme = event.target.value;
          hands.draw();
        });
      }
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const setSystemTheme = () => {
        const systemTheme = darkModeMediaQuery.matches ? 'dark' : 'light';
        darkModeSelect && (darkModeSelect.value = systemTheme);
        dial.theme = systemTheme;
        hands.draw();
      };
      darkModeMediaQuery.addEventListener('change', setSystemTheme);
      const backgroundModeSelect = document.getElementById('background_mode_select');
      if( backgroundModeSelect ) {
        Object.defineProperty(backgroundModeSelect, 'value', {
          set: (value) => {
            backgroundModeSelect.querySelector(`input[value="${value}"]:not(:checked)`)?.click();
          },
          get: () => backgroundModeSelect.querySelector('input:checked')?.value,
        });
        backgroundModeSelect.addEventListener('change', (event) => {
          dial.backgroundMode = event.target.value;
        });
        dial.backgroundMode = backgroundModeSelect.value;
      }
      if( darkModeSelect || backgroundModeSelect ) {
        // Restore the currently selected theme display when page back
        window.addEventListener("pageshow", () => {
          if( darkModeSelect ) {
            dial.theme = darkModeSelect.value;
            hands.draw();
          }
          if( backgroundModeSelect ) {
            dial.backgroundMode = backgroundModeSelect.value;
          }
        });
      }
      const chordButtonCanvas = document.getElementById('circleOfFifthsClockChordButtonCanvas');
      if( chordButtonCanvas ) {
        activateChordButton(
          chordButtonCanvas,
          dial,
          () => {
            darkModeSelect.value = "dark";
            backgroundModeSelect.value = "pie";
          }
        );
      }
      setSystemTheme();
      hands.moving = true;
    }
    window.addEventListener("load", loader);
  };
};
