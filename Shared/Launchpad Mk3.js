// This file contains functionality that is common between all Launchpad Mk3
// controllers. Can be imported by specific controller implementations.

/* VERSION 1 */
/* global midi */

/* import "Shared/Constants.js" */
/* global Constants */

/* import "Shared/Helpers.js" */
/* global Util */

/**
 * Device-specific SysEx messages.
 */
const SysEx = {
  standaloneMode: 0x00,
  dawMode: 0x01,
  setMode: 0x10,
  sessionLayout: 0x00,
  setLayout: 0x00,
  clearDawState: 0x12,
  setSessionButton: 0x14,
};

/**
 * Device-specific constants describing button/pad layout.
 */
const Layout = {
  topLeftPad: 81,
  rowSkip: 10,
  cols: 8,
  rows: 8,
};

/**
 * Device-specific constants describing button/pad colors.
 */
const Color = {
  off: 0,
  gray: 1,
  lightGray: 2,
  white: 3,
  lightRed: 4,
  red: 5,
  darkRed: 7,
  lightOrange: 8,
  orange: 9,
  darkOrange: 11,
  lightYellow: 12,
  yellow: 13,
  darkYellow: 15,
  lightGreen: 20,
  green: 21,
  darkGreen: 23,
  lightBlue: 40,
  blue: 41,
  darkBlue: 43,
  accent01: 40,
  accent02: 28,
  accent03: 12,
  accent04: 56,
  accent05: 48,
  accent06: 32,
  accent07: 16,
  accent08: 4,
  accent09: 52,
};

/**
 * Device-specific constants describing button/pad lighting.
 */
const Lighting = {
  static: 0,
  flashing: 1,
  pulsing: 2,
};

/**
 * Device-specific constants identifying buttons.
 */
const Button = {
  col0: 91,
  col1: 92,
  col2: 93,
  col3: 94,
  col4: 95,
  col5: 96,
  col6: 97,
  col7: 98,
  logo: 99,
  row0: 89,
  row1: 79,
  row2: 69,
  row3: 59,
  row4: 49,
  row5: 39,
  row6: 29,
  row7: 19,
};

/**
 * Device-specific constants aliasing buttons.
 */
const ButtonAlias = {
  session: Button.col4,
};

/**
 * A pad that is represented by absolute row/column pairs.
 * Navigating up/down/left/right doesn't affect this pad's coords.
 */
class RowColPad {
  /**
   * Constructs a pad instance for a row and column.
   * @param {Number} row
   * @param {Number} col
   */
  constructor(row, col) {
    this.row = row;
    this.col = col;
  }

  /**
   * Gets a hashable id for this pad.
   * @return {String}
   */
  get id() {
    return `${this.row},${this.col}`;
  }

  /**
   * Constructs this pad using its hashable id.
   * @param {String} id
   * @return {RowColPad}
   */
  static fromId(id) {
    const [row, col] = id.split(",").map(Number);
    return new RowColPad(row, col);
  }
}

/**
 * A pad that is represented by a clip's track and slot indices.
 * Navigating up/down/left/right will offset this pad's coords.
 */
class TrackSlotPad {
  /**
   * Constructs a pad instance for a track and slot pair.
   * @param {Number} track
   * @param {Number} slot
   */
  constructor(track, slot) {
    this.track = track;
    this.slot = slot;
  }

  /**
   * Gets a hashable id for this pad.
   * @return {String}
   */
  get id() {
    return `${this.track},${this.slot}`;
  }

  /**
   * Constructs this pad using its hashable id.
   * @param {String} id
   * @return {TrackSlotPad}
   */
  static fromId(id) {
    const [track, slot] = id.split(",").map(Number);
    return new TrackSlotPad(track, slot);
  }
}

/**
 * A `Color` and `Lighting` pair describing the style of a pad or button.
 */
class Style {
  /**
   * Constructs a style instance for a color and lighting pair.
   * @param {Color} color
   * @param {Lighting} lighting
   */
  constructor(color, lighting = Lighting.static) {
    this.color = color;
    this.lighting = lighting;
  }

  /**
   * Checks if this style is equal to another style.
   * @param {Style} other
   * @return {Boolean}
   */
  equals(other) {
    return this.color == other.color && this.lighting == other.lighting;
  }
}

/**
 * A full representation of all the buttons and pads on the controller. This is
 * used for comparing old and new state and then sending appropriate commands.
 */
class ViewState {
  /**
   * Constructs a view state instance.
   * @param {Boolean} clear Whether no previous state should be assumed.
   */
  constructor(clear = false) {
    this.clear = clear;
    this.buttons = new Map(); // Map<Button, Style>
    this.pads = new Map(); // Map<RowColPad, Style>
  }
}

/**
 * This class is extended by all Launchpad Mk3-style controllers and describes
 * functionality that is common between them.
 */
class LaunchpadMk3 {
  /**
   * Constructs a Launchpad controller instance.
   * @param {Array<Number>} id The SysEx preamble identifying the controller.
   */
  constructor(id) {
    this.id = id;
    this.viewState = new ViewState();
    this.trackOffset = 0;
    this.slotOffset = 0;
  }

  // Common device callbacks
  // Invoked by subclasses.

  /**
   * Must be invoked by implementors when a SysEx message is received
   * specifying that the device has entered 'standalone mode'.
   */
  didEnterStandaloneMode() {
    // noop
  }

  /**
   * Must be invoked by implementors when a SysEx message is received
   * specifying that the device has entered 'DAW mode'.
   */
  didEnterDawMode() {
    midi.emit(this.setSessionLayoutMessage());
    this.viewState = new ViewState();
    this.render(true);
  }

  // Common message builders
  // Used to build SysEx messages (but without transmitting them).

  /**
   * Builds a readback SysEx message setting the device in standalone mode.
   * Does not actually send any message, only builds an array of numbers.
   * @return {Array<Number>}
   */
  enterStandaloneModeMessage() {
    const message = Util.sysEx(this.id, [SysEx.setMode, SysEx.standaloneMode]);
    const readback = Util.sysEx(this.id, [SysEx.standaloneMode]);
    return [...message, ...readback];
  }

  /**
   * Builds a readback SysEx message setting the device in DAW mode.
   * Does not actually send any message, only builds an array of numbers.
   * @return {Array<Number>}
   */
  enterDawModeMessage() {
    const message = Util.sysEx(this.id, [SysEx.setMode, SysEx.dawMode]);
    const readback = Util.sysEx(this.id, [SysEx.setMode]);
    return [...message, ...readback];
  }

  /**
   * Builds a SysEx message clearing the device.
   * Does not actually send any message, only builds an array of numbers.
   * @param {Boolean} notes Whether the note-identified pads should be cleared.
   * @param {Boolean} ccs Whether the cc-identified buttons should be cleared.
   * @return {Array<Number>}
   */
  clearDawStateMessage(notes = true, ccs = true) {
    return Util.sysEx(this.id, [SysEx.clearDawState, notes ? 1 : 0, 0, ccs ? 1 : 0]);
  }

  /**
   * Builds a SysEx message switching the device to the Session view.
   * Does not actually send any message, only builds an array of numbers.
   * @return {Array<Number>}
   */
  setSessionLayoutMessage() {
    return Util.sysEx(this.id, [SysEx.setLayout, SysEx.sessionLayout]);
  }

  /**
   * Builds a SysEx message resetting Session button to the default style.
   * Does not actually send any message, only builds an array of numbers.
   * @return {Array<Number>}
   */
  resetSessionButtonMessage() {
    return Util.sysEx(this.id, [SysEx.setSessionButton, 0, 0]);
  }

  /**
   * Builds a SysEx message for customizing the Session button.
   * Does not actually send any message, only builds an array of numbers.
   * @param {Color} active
   * @param {Color} inactive
   * @return {Array<Number>}
   */
  setSessionButtonMessage(active, inactive = Color.off) {
    return Util.sysEx(this.id, [SysEx.setSessionButton, active, inactive]);
  }

  /**
   * Builds a SysEx message for customizing a button.
   * Does not actually send any message, only builds an array of numbers.
   * @param {Button} button
   * @param {Color} color
   * @param {Lighting} lighting
   * @return {Array<Number>}
   */
  setButtonMessage(button, color, lighting = Lighting.static) {
    if (button == ButtonAlias.session && color == Color.off) {
      return this.resetSessionButtonMessage();
    }
    if (button == ButtonAlias.session && color != Color.off) {
      return this.setSessionButtonMessage(color);
    }
    return [Constants.kControlChange + lighting, button, color];
  }

  /**
   * Builds a SysEx message for customizing a pad.
   * @param {Number} row
   * @param {Number} col
   * @param {Color} color
   * @param {Lighting} lighting
   * @return {Array<Number>}
   */
  setPadMessage(row, col, color, lighting = Lighting.static) {
    const index = col - row * Layout.rowSkip;
    return [Constants.kNoteOn + lighting, Layout.topLeftPad + index, color];
  }

  // Common state diffing

  /**
   * Whenever something needs to visually change on the controller (e.g. pads
   * lighting up, buttons blinking etc.), a full new description of it is built,
   * representing the next desired state. This method compares this next state
   * to the previous existing state. The differences are then converted into an
   * array of SysEx messages which represent the most efficient set of changes
   * that need to be made to update the controller.
   * @param {ViewState} prev
   * @param {ViewState} next
   * @return {Array<Number>}
   */
  diff(prev, next) {
    const messages = [];

    // Clear the controller if no previous state is assumed.
    if (next.clear) {
      messages.push(...this.clearDawStateMessage());
      messages.push(...this.resetSessionButtonMessage());
    }

    // Turn off all buttons that aren't used in the next state.
    for (const button of prev.buttons.keys()) {
      // If the button is explicity styled in the next state, don't turn it off.
      if (next.buttons.has(button)) {
        continue;
      }
      messages.push(...this.setButtonMessage(button, Color.off));
    }

    // Turn off all pads that aren't used in the next state.
    for (const id of prev.pads.keys()) {
      // When the pad is offset out of bounds, no changes are necessary.
      const pad = RowColPad.fromId(id);
      if (!this.isInBounds(pad)) {
        continue;
      }
      // If the pad is explicity styled in the next state, don't turn it off.
      if (next.pads.has(id)) {
        continue;
      }
      messages.push(...this.setPadMessage(pad.row, pad.col, Color.off));
    }

    // Update all buttons in the next state that differ from the previous state.
    for (const [button, style] of next.buttons) {
      // When the color and lighting are the same, no changes are necessary.
      const prevStyle = prev.buttons.get(button);
      if (prevStyle != null && prevStyle.equals(style)) {
        continue;
      }
      // When the lighting changes, need to prepend an 'off' message.
      if (prevStyle != null && prevStyle.lighting != style.lighting) {
        messages.push(...this.setButtonMessage(button, Color.off));
      }
      messages.push(...this.setButtonMessage(button, style.color, style.lighting));
    }

    // Update all pads in the next state that differ from the previous state.
    for (const [id, style] of next.pads) {
      // When the pad is offset out of bounds, no changes are necessary.
      const pad = RowColPad.fromId(id);
      if (!this.isInBounds(pad)) {
        continue;
      }
      // When the color and lighting are the same, no changes are necessary.
      const prevStyle = prev.pads.get(id);
      if (prevStyle != null && prevStyle.equals(style)) {
        continue;
      }
      // When the lighting changes, need to prepend an 'off' message.
      if (prevStyle != null && prevStyle.lighting != style.lighting) {
        messages.push(...this.setPadMessage(pad.row, pad.col, Color.off));
      }
      messages.push(...this.setPadMessage(pad.row, pad.col, style.color, style.lighting));
    }

    return messages;
  }

  // Common helpers

  /**
   * Checks if a pad is inside the visible bounds.
   * @param {RowColPad} pad
   * @return {Boolean}
   */
  isInBounds(pad) {
    const { row, col } = pad;
    return row >= 0 && row < Layout.rows && col >= 0 && col < Layout.cols;
  }

  /**
   * Gets the absolute row and column coordinates for a track and slot pair,
   * that can be offset when pressing the arrow buttons.
   * @param {Number} track
   * @param {Number} slot
   * @return {Array<Number>}
   */
  getPadCoords(track, slot) {
    const row = slot - this.slotOffset;
    const col = track - this.trackOffset;
    return [row, col];
  }

  /**
   * Gets the absolute row and column coordinates for a MIDI note.
   * @param {Number} pitch
   * @param {Number} slot
   * @return {Array<Number>}
   */
  getRowAndCol(pitch) {
    const row = Layout.rows - Math.floor(pitch / Layout.rowSkip);
    const col = (pitch % Layout.rowSkip) - (Layout.topLeftPad % Layout.rowSkip);
    return [row, col];
  }

  /**
   * Gets the track and slot coordinates for a MIDI note.
   * @param {Number} pitch
   * @param {Number} slot
   * @return {Array<Number>}
   */
  getTrackAndSlot(pitch) {
    const [row, col] = this.getRowAndCol(pitch);
    const track = col + this.trackOffset;
    const slot = row + this.slotOffset;
    return [track, slot];
  }

  /**
   * Gets the controller color for a clip depending on the selected color index.
   * @param {atom.Clip} clip
   * @return {Color}
   */
  getRawColor(clip) {
    switch (clip.getColor() % 9) {
      case 0:
        return Color.accent01;
      case 1:
        return Color.accent02;
      case 2:
        return Color.accent03;
      case 3:
        return Color.accent04;
      case 4:
        return Color.accent05;
      case 5:
        return Color.accent06;
      case 6:
        return Color.accent07;
      case 7:
        return Color.accent08;
      case 8:
        return Color.accent09;
      default:
        return Color.off;
    }
  }

  /**
   * Gets the desired color for a clip depending on the play state.
   * @param {atom.Clip} clip
   * @return {Color}
   */
  getColor(clip) {
    if (clip.isRecording()) {
      return Color.red;
    }
    if (clip.willStart() || clip.isPlaying()) {
      return Color.green;
    }
    return this.getRawColor(clip);
  }

  /**
   * Gets the desired lighting for a clip depending on the play state.
   * @param {atom.Clip} clip
   * @return {Color}
   */
  getLighting(clip) {
    if (clip.willStart() || clip.willStop()) {
      return Lighting.flashing;
    }
    if (clip.isPlaying()) {
      return Lighting.pulsing;
    }
    return Lighting.static;
  }
}
