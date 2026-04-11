
const setupToneIndicatorCanvas = (dial, keySignatureSelector) => {
  const canvas = document.getElementById('circleOfFifthsClockToneIndicatorCanvas');
  const BASS_MAX_NOTE_NUMBER = 48;
  const { width, height } = canvas;
  const { center, borderRadius } = dial;
  const toneIndicating = Array.from({ length: 12 }, () => 0);
  const bassToneIndicating = [...toneIndicating];
  const getColorOf = (hour, flatThreshold) => {
    let offset = hour - keySignatureSelector?.numberOfSharps + 1; // min:-6, max:19 (when hour:0...11, keySignature:-7...7)
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

const setupBeatCanvas = (dial, keySignatureSelector) => {
  const beatCanvas = document.getElementById("circleOfFifthsClockBeatCanvas");
  const radianPerHour = Math.PI / 6;
  const context = beatCanvas.getContext("2d");
  const { center, canvas: { width, height } } = dial;
  const cxy = [center.x, center.y];
  beatCanvas.drawBeat = (beat, numerator) => {
    context.clearRect(0, 0, width, height);
    if( beat === undefined ) return;
    const ratio = numerator - beat < 2 ? 0 : 1 / (2 ** beat);
    const outer = dial.borderRadius[keySignatureSelector.minor ? 1 : 2];
    const inner = outer - ratio * (outer - dial.borderRadius[keySignatureSelector.minor ? 0 : 1]);
    const startAngle = (keySignatureSelector.numberOfSharps - 3.5) * radianPerHour;
    const endAngle = startAngle + radianPerHour;
    context.fillStyle = `color-mix(in srgb, ${dial.themeColor.indicator[1]} 15%, transparent)`;
    context.beginPath();
    context.arc(...cxy, inner * width, startAngle, endAngle);
    context.arc(...cxy, outer * width, endAngle, startAngle, true);
    context.fill();
  };
  return beatCanvas;
};
