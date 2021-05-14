// This file implements functionality for the Launchpad Pro Mk3 controller.
// To customize this controller, disable and duplicate this script.

/* VERSION 1 */
/* global atom, midi */

/* import "Shared/Helpers.js" */
/* global Util */

/* import "Shared/Launchpad Mk3.js" */
/* global SysEx */
/* global Layout */
/* global Color */
/* global Lighting */
/* global Button */
/* global ButtonAlias */
/* global RowColPad */
/* global TrackSlotPad */
/* global Style */
/* global ViewState */
/* global LaunchpadMk3 */

/**
 * Additional model-specific SysEx messages.
 */
SysEx.noteLayout = 0x04;
SysEx.chordLayout = 0x02;
SysEx.customLayout = 0x03;

/**
 * Additional device-specific constants identifying buttons on the left row.
 */
const LeftButton = {
  shift: 90,
  row0: 80,
  row1: 70,
  row2: 60,
  row3: 50,
  row4: 40,
  row5: 30,
  row6: 20,
  row7: 10,
};

/**
 * Additional device-specific constants identifying buttons on the bottom row.
 */
const BottomButton = {
  col0_above: 101,
  col1_above: 102,
  col2_above: 103,
  col3_above: 104,
  col4_above: 105,
  col5_above: 106,
  col6_above: 107,
  col7_above: 108,
  col0_below: 1,
  col1_below: 2,
  col2_below: 3,
  col3_below: 4,
  col4_below: 5,
  col5_below: 6,
  col6_below: 7,
  col7_below: 8,
};

/**
 * Additional device-specific constants aliasing buttons.
 */
ButtonAlias.up = LeftButton.row0;
ButtonAlias.down = LeftButton.row1;
ButtonAlias.left = Button.col0;
ButtonAlias.right = Button.col1;
ButtonAlias.stop = BottomButton.col7_below;
ButtonAlias.solo = BottomButton.col2_below;
ButtonAlias.mute = BottomButton.col1_below;
ButtonAlias.record = BottomButton.col0_below;
ButtonAlias.clear = LeftButton.row2;
ButtonAlias.duplicate = LeftButton.row3;
ButtonAlias.quantize = LeftButton.row4;
ButtonAlias.play = LeftButton.row6;
ButtonAlias.arm = LeftButton.row7;

/**
 * Implementation-specific constants describing the current view mode.
 */
const ViewMode = {
  note: 1,
  chord: 2,
  custom: 3,
  session: 4,
  internal: 5,
};

/**
 * Implementation-specific constants describing the current main input mode.
 */
const MainInputMode = {
  none: 1,
  stop: 2,
  solo: 3,
  mute: 4,
  record: 5,
};

/**
 * Implementation-specific constants describing the current pattern input mode.
 */
const MomentaryInputMode = {
  none: 1,
  clear: 2,
  duplicate: 3,
  quantize: 4,
};

/**
 * A full representation of the current internal controller state. This is used
 * for responding appropriately to button and pad presses.
 */
class ControllerState {
  /**
   * Constructs a controller state instance.
   */
  constructor() {
    this.viewMode = ViewMode.session;
    this.inputMode = MainInputMode.none;
    this.momentaryInputMode = MomentaryInputMode.none;
    this.stopping = new Set(); // Set<TrackSlotPad>
    this.highlighting = new Set(); // Set<TrackSlotPad>
  }
}

/**
 * Launchpad X controller.
 */
class LPProMk3 extends LaunchpadMk3 {
  /**
   * Constructs a Launchpad X controller instance.
   */
  constructor() {
    super([0x00, 0x20, 0x29, 0x02, 0x0e]);
    this.controllerState = new ControllerState();
    this.isFirstConnection = true;
  }

  // Additional message builders
  // Used to build SysEx messages (but without transmitting them).

  /**
   * @override
   * On a Launchpad Pro Mk3, a clear message is unavailable.
   *
   * Builds a SysEx message clearing the device.
   * Does not actually send any message, only builds an array of numbers.
   * @return {Array<Number>}
   */
  clearDawStateMessage() {
    const messages = [];

    // Clear all pads.
    for (let i = 0; i < Layout.rows; i++) {
      for (let j = 0; j < Layout.cols; j++) {
        const pad = new RowColPad(i, j);
        messages.push(...this.setPadMessage(pad.row, pad.col, Color.off));
      }
    }

    // Clear all buttons.
    for (const button of Object.values(Button)) {
      messages.push(...this.setButtonMessage(button, Color.off));
    }
    for (const button of Object.values(LeftButton)) {
      messages.push(...this.setButtonMessage(button, Color.off));
    }
    for (const button of Object.values(BottomButton)) {
      messages.push(...this.setButtonMessage(button, Color.off));
    }

    return messages;
  }

  /**
   * @override
   * On a Launchpad Pro Mk3, the message format is different.
   *
   * Builds a SysEx message switching the device to the Session view.
   * Does not actually send any message, only builds an array of numbers.
   * @return {Array<Number>}
   */
  setSessionLayoutMessage() {
    return Util.sysEx(this.id, [SysEx.setLayout, SysEx.sessionLayout, 0, 0]);
  }

  /**
   * Builds a SysEx message requesting the current layout.
   * Does not actually send any message, only builds an array of numbers.
   * @return {Array<Number>}
   */
  requestLayoutMessage() {
    return Util.sysEx(this.id, [SysEx.setLayout]);
  }

  // Custom device callbacks

  /**
   * Invoked when a SysEx message was received specifying that the device has
   * entered the session layout.
   */
  didSwitchToSessionLayout() {
    this.controllerState.viewMode = ViewMode.session;
    this.didSwitchLayout();
  }

  /**
   * Invoked when a SysEx message was received specifying that the device has
   * entered the note layout.
   */
  didSwitchToNoteLayout() {
    this.controllerState.viewMode = ViewMode.note;
    this.didSwitchLayout();
  }

  /**
   * Invoked when a SysEx message was received specifying that the device has
   * entered the chord layout.
   */
  didSwitchToChordLayout() {
    this.controllerState.viewMode = ViewMode.chord;
    this.didSwitchLayout();
  }

  /**
   * Invoked when a SysEx message was received specifying that the device has
   * entered the custom layout.
   */
  didSwitchToCustomLayout() {
    this.controllerState.viewMode = ViewMode.custom;
    this.didSwitchLayout();
  }

  /**
   * Invoked when a SysEx message was received specifying that the device has
   * entered an internal layout (such as 'sequencer').
   */
  didSwitchToInternalLayout() {
    this.controllerState.viewMode = ViewMode.internal;
    this.didSwitchLayout();
  }

  /**
   * Invoked when a SysEx message was received specifying that the device has
   * switched layout (such as from 'session' to 'note' or vice-versa).
   */
  didSwitchLayout() {
    // Unfortunately, Launchpad Pro Mk3 doesn't have a readback version of the
    // `SysEx.setMode` message so the `SysEx.setLayout` message is used instead.
    // If this is the first time the controller is connected:
    // 1. It was put into DAW mode by the connection messages, and
    // 2. The current layout mode was requested.
    if (this.isFirstConnection) {
      this.isFirstConnection = false;
      this.didEnterDawMode();
    } else {
      this.render();
    }
  }

  /**
   * Invoked when a pad is pressed.
   * @param {Number} pitch
   * @param {Number} velocity
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didPressPad(pitch, velocity, channel, timestamp) {
    const { viewMode, inputMode, momentaryInputMode } = this.controllerState;
    const { stopping, highlighting } = this.controllerState;
    const [track, slot] = this.getTrackAndSlot(pitch);
    const clip = atom.getClipOnTrackAndSlot(track, slot);

    const isSessionView = viewMode == ViewMode.session;
    const isNoteView = viewMode == ViewMode.note;
    const isChordView = viewMode == ViewMode.chord;
    const isCustomView = viewMode == ViewMode.custom;
    const isRecordInputMode = inputMode == MainInputMode.record;
    const isMomentaryClearInputMode = momentaryInputMode == MomentaryInputMode.clear;
    const isMomentaryDuplicateInputMode = momentaryInputMode == MomentaryInputMode.duplicate;
    const isMomentaryQuantizeInputMode = momentaryInputMode == MomentaryInputMode.quantize;

    if (isNoteView || isChordView || isCustomView) {
      atom.receiveNoteOn(pitch, velocity, channel, timestamp);
      return;
    }

    if (isMomentaryClearInputMode || isMomentaryDuplicateInputMode || isMomentaryQuantizeInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.add(pad.id);
      this.render();
      return;
    }

    if (isSessionView && isRecordInputMode) {
      if (clip != null && !clip.isRecording()) {
        atom.armClip(track, slot);
      } else if (clip != null && clip.isRecording()) {
        atom.disarmClip(track, slot);
      } else if (atom.isAnyPlayingOnTrack(track)) {
        const pad = new TrackSlotPad(track, slot);
        stopping.add(pad.id);
        atom.stopTrack(track);
      } else if (atom.isAnyTriggeringOnTrack(track)) {
        atom.stopTrack(track);
      }
      this.render();
      return;
    }

    if (isSessionView) {
      if (clip != null && !clip.isLaunched()) {
        switch (clip.getNoteOnLaunchBehavior()) {
          case "noop":
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:noop, launched:release":
            break; // noop
          case "unlaunched:trigger, launched:noop":
          case "unlaunched:trigger, launched:retrigger":
          case "unlaunched:trigger, launched:release":
            atom.launchClip(track, slot);
            break;
        }
      } else if (clip != null && clip.isLaunched()) {
        switch (clip.getNoteOnLaunchBehavior()) {
          case "noop":
          case "unlaunched:trigger, launched:noop":
            break; // noop
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:trigger, launched:retrigger":
            atom.stopClip(track, slot);
            atom.launchClip(track, slot);
            break;
          case "unlaunched:noop, launched:release":
          case "unlaunched:trigger, launched:release":
            atom.stopClip(track, slot);
            break;
        }
      } else if (atom.isAnyPlayingOnTrack(track)) {
        const pad = new TrackSlotPad(track, slot);
        stopping.add(pad.id);
        atom.stopTrack(track);
      } else if (atom.isAnyTriggeringOnTrack(track)) {
        atom.stopTrack(track);
      }
      this.render();
      return;
    }
  }

  /**
   * Invoked when a pad is depressed.
   * @param {Number} pitch
   * @param {Number} velocity
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didUnpressPad(pitch, velocity, channel, timestamp) {
    const { viewMode, momentaryInputMode, highlighting } = this.controllerState;
    const [track, slot] = this.getTrackAndSlot(pitch);
    const clip = atom.getClipOnTrackAndSlot(track, slot);

    const isSessionView = viewMode == ViewMode.session;
    const isNoteView = viewMode == ViewMode.note;
    const isChordView = viewMode == ViewMode.chord;
    const isCustomView = viewMode == ViewMode.custom;
    const isMomentaryClearInputMode = momentaryInputMode == MomentaryInputMode.clear;
    const isMomentaryDuplicateInputMode = momentaryInputMode == MomentaryInputMode.duplicate;
    const isMomentaryQuantizeInputMode = momentaryInputMode == MomentaryInputMode.quantize;

    if (isNoteView || isChordView || isCustomView) {
      atom.receiveNoteOff(pitch, velocity, channel, timestamp);
      return;
    }

    if (isMomentaryClearInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.delete(pad.id);
      atom.clearActivePattern(track, slot);
      this.render();
      return;
    }

    if (isMomentaryDuplicateInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.delete(pad.id);
      atom.duplicateActivePattern(track, slot);
      this.render();
      return;
    }

    if (isMomentaryQuantizeInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.delete(pad.id);
      atom.toggleQuantization(track, slot);
      this.render();
      return;
    }

    if (isSessionView) {
      if (clip != null && !clip.isLaunched()) {
        switch (clip.getNoteOffLaunchBehavior()) {
          case "noop":
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:noop, launched:release":
            break; // noop
          case "unlaunched:trigger, launched:noop":
          case "unlaunched:trigger, launched:retrigger":
          case "unlaunched:trigger, launched:release":
            atom.launchClip(track, slot);
            break;
        }
      } else if (clip != null && clip.isLaunched()) {
        switch (clip.getNoteOffLaunchBehavior()) {
          case "noop":
          case "unlaunched:trigger, launched:noop":
            break; // noop
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:trigger, launched:retrigger":
            atom.stopClip(track, slot);
            atom.launchClip(track, slot);
            break;
          case "unlaunched:noop, launched:release":
          case "unlaunched:trigger, launched:release":
            atom.stopClip(track, slot);
            break;
        }
      }
      this.render();
      return;
    }
  }

  /**
   * Invoked when a button is pressed.
   * @param {Button} button
   * @param {Number} value
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didPressButton(button, value, channel, timestamp) {
    const { viewMode, inputMode, stopping } = this.controllerState;
    const [maxTrack, maxSlot] = atom.getMaxTrackAndSlot();
    const track = this.getTrackForButton(button);

    const isSessionView = viewMode == ViewMode.session;
    const isStopInputMode = inputMode == MainInputMode.stop;
    const isSoloInputMode = inputMode == MainInputMode.solo;
    const isMuteInputMode = inputMode == MainInputMode.mute;
    const isRecordInputMode = inputMode == MainInputMode.record;

    if (button == ButtonAlias.right && this.trackOffset < maxTrack) {
      this.trackOffset += 1;
      this.render();
      return;
    }

    if (button == ButtonAlias.left && this.trackOffset > 0) {
      this.trackOffset -= 1;
      this.render();
      return;
    }

    if (button == ButtonAlias.down && this.slotOffset < maxSlot) {
      this.slotOffset += 1;
      this.render();
      return;
    }

    if (button == ButtonAlias.up && this.slotOffset > 0) {
      this.slotOffset -= 1;
      this.render();
      return;
    }

    if (button == Button.row0) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 0));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 0);
      this.render();
      return;
    }

    if (button == Button.row1) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 1));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 1);
      this.render();
      return;
    }

    if (button == Button.row2) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 2));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 2);
      this.render();
      return;
    }

    if (button == Button.row3) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 3));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 3);
      this.render();
      return;
    }

    if (button == Button.row4) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 4));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 4);
      this.render();
      return;
    }

    if (button == Button.row5) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 5));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 5);
      this.render();
      return;
    }

    if (button == Button.row6) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 6));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 6);
      this.render();
      return;
    }

    if (button == Button.row7) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 7));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 7);
      this.render();
      return;
    }

    if (button == ButtonAlias.play) {
      const tracks = atom.getAllPlayingTracks();
      if (tracks.length) {
        atom.launchScene(maxSlot + 1);
      } else {
        atom.launchScene(0);
      }
      return;
    }

    if (button == ButtonAlias.arm) {
      const focused = atom.getAllFocusedClips();
      const recording = atom.getAllRecordingTracks();
      if (focused.length) {
        if (recording.length) {
          focused.forEach((clip) => atom.disarmClip(clip.getTrack(), clip.getSlot()));
        } else {
          focused.forEach((clip) => atom.armClip(clip.getTrack(), clip.getSlot()));
        }
      } else {
        if (recording.length) {
          recording.forEach((track) => atom.disarmTrack(track));
        } else {
          // noop
        }
      }
    }

    if (button == ButtonAlias.stop) {
      if (isStopInputMode) {
        this.controllerState.inputMode = MainInputMode.none;
      } else {
        this.controllerState.inputMode = MainInputMode.stop;
      }
      this.render();
      return;
    }

    if (button == ButtonAlias.solo) {
      if (isSoloInputMode) {
        this.controllerState.inputMode = MainInputMode.none;
      } else {
        this.controllerState.inputMode = MainInputMode.solo;
      }
      this.render();
      return;
    }

    if (button == ButtonAlias.mute) {
      if (isMuteInputMode) {
        this.controllerState.inputMode = MainInputMode.none;
      } else {
        this.controllerState.inputMode = MainInputMode.mute;
      }
      this.render();
      return;
    }

    if (button == ButtonAlias.record) {
      if (isRecordInputMode) {
        this.controllerState.inputMode = MainInputMode.none;
      } else {
        this.controllerState.inputMode = MainInputMode.record;
      }
      this.render();
      return;
    }

    if (isRecordInputMode && atom.hasClipOnTrack(track)) {
      if (atom.isAnyRecordingOnTrack(track)) {
        atom.disarmTrack(track);
      } else {
        const launchedClip = atom.getLaunchedClipWithLowestSlotOnTrack(track);
        const lowestClip = atom.getClipWithLowestSlotOnTrack(track);
        if (launchedClip != null) {
          atom.armClip(track, launchedClip.getSlot());
        } else if (lowestClip != null) {
          atom.armClip(track, lowestClip.getSlot());
        }
      }
      return;
    }

    if (isStopInputMode && atom.hasClipOnTrack(track)) {
      atom.stopTrack(track);
      return;
    }

    if (isSoloInputMode && atom.hasClipOnTrack(track)) {
      if (atom.isAllSoloingOnTrack(track)) {
        atom.unsoloTrack(track);
      } else {
        atom.soloTrack(track);
      }
      return;
    }

    if (isMuteInputMode && atom.hasClipOnTrack(track)) {
      if (atom.isAllMutedOnTrack(track)) {
        atom.unmuteTrack(track);
      } else {
        atom.muteTrack(track);
      }
      return;
    }

    if (isSessionView && button == ButtonAlias.clear) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.clear;
      this.render();
      return;
    }

    if (isSessionView && button == ButtonAlias.duplicate) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.duplicate;
      this.render();
      return;
    }

    if (isSessionView && button == ButtonAlias.quantize) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.quantize;
      this.render();
      return;
    }
  }

  /**
   * Invoked when a button is depressed.
   * @param {Button} button
   * @param {Number} value
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didUnpressButton(button, value, channel, timestamp) {
    const { viewMode, highlighting } = this.controllerState;

    const isSessionView = viewMode == ViewMode.session;

    if (isSessionView && button == ButtonAlias.clear) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.none;
      highlighting.clear();
      this.render();
      return;
    }

    if (isSessionView && button == ButtonAlias.duplicate) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.none;
      highlighting.clear();
      this.render();
      return;
    }

    if (isSessionView && button == ButtonAlias.quantize) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.none;
      highlighting.clear();
      this.render();
      return;
    }
  }

  /**
   * Invoked on any polyphonic aftertouch message.
   * @param {Number} pitch
   * @param {Number} pressure
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didPolyphonicAftertouch(pitch, pressure, channel, timestamp) {
    const { viewMode } = this.controllerState;

    const isNoteView = viewMode == ViewMode.note;
    const isChordView = viewMode == ViewMode.chord;
    const isCustomView = viewMode == ViewMode.custom;

    if (isNoteView || isChordView || isCustomView) {
      atom.receivePolyphonicAftertouch(pitch, pressure, channel, timestamp);
      return;
    }
  }

  /**
   * Invoked on any channel aftertouch message.
   * @param {Number} pressure
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didChannelAftertouch(pressure, channel, timestamp) {
    const { viewMode } = this.controllerState;

    const isNoteView = viewMode == ViewMode.note;
    const isChordView = viewMode == ViewMode.chord;
    const isCustomView = viewMode == ViewMode.custom;

    if (isNoteView || isChordView || isCustomView) {
      atom.receiveChannelAftertouch(pressure, channel, timestamp);
      return;
    }
  }

  // Custom lifecycle callbacks

  /**
   * Invoked when the play state of a clip has been updated.
   * @param {Number} track
   * @param {Number} slot
   */
  update(track, slot) {
    const { stopping } = this.controllerState;
    const isStopping = atom.isAnyReleasingOnTrack(track);

    const pads = Array.from(stopping, TrackSlotPad.fromId);
    const padsOnOtherTracks = pads.filter((e) => e.track != track);
    const padsOnGivenTrackIfStopping = pads.filter((e) => e.track == track && isStopping);
    const padsToKeep = [...padsOnOtherTracks, ...padsOnGivenTrackIfStopping];
    Util.formIntersection(stopping, new Set(padsToKeep.map((e) => e.id)));
  }

  /**
   * Invoked when the controller must be updated.
   * @param {Boolean} clear Whether no previous state should be assumed.
   */
  render(clear) {
    const { viewMode, inputMode, momentaryInputMode } = this.controllerState;
    const { stopping, highlighting } = this.controllerState;
    const [maxTrack, maxSlot] = atom.getMaxTrackAndSlot();

    const isSessionView = viewMode == ViewMode.session;
    const isMomentaryClearInputMode = momentaryInputMode == MomentaryInputMode.clear;
    const isMomentaryDuplicateInputMode = momentaryInputMode == MomentaryInputMode.duplicate;
    const isMomentaryQuantizeInputMode = momentaryInputMode == MomentaryInputMode.quantize;
    const isWaiting = isMomentaryClearInputMode || isMomentaryDuplicateInputMode || isMomentaryQuantizeInputMode;

    const nextState = new ViewState(clear);

    for (const clip of atom.getAllFocusedClips()) {
      const color = this.getRawColor(clip);
      const lighting = this.getLighting(clip);
      nextState.buttons.set(Button.logo, new Style(color, lighting));
    }

    for (const id of stopping) {
      const { track, slot } = TrackSlotPad.fromId(id);
      const [row, col] = this.getPadCoords(track, slot);
      const pad = new RowColPad(row, col);
      nextState.pads.set(pad.id, new Style(Color.darkGreen, Lighting.flashing));
    }

    for (const clip of atom.getClips()) {
      const isLaunched = clip.isLaunched();
      const track = clip.getTrack();
      const slot = clip.getSlot();
      const [row, col] = this.getPadCoords(track, slot);
      const pad = new RowColPad(row, col);
      const color = isWaiting ? (isLaunched ? this.getRawColor(clip) : Color.lightGray) : this.getColor(clip);
      const lighting = this.getLighting(clip);
      nextState.pads.set(pad.id, new Style(color, lighting));
    }

    for (const id of highlighting) {
      const { track, slot } = TrackSlotPad.fromId(id);
      const [row, col] = this.getPadCoords(track, slot);
      const pad = new RowColPad(row, col);
      nextState.pads.set(pad.id, new Style(Color.white));
    }

    if (this.trackOffset > 0) {
      nextState.buttons.set(ButtonAlias.left, new Style(Color.lightGray));
    }
    if (this.trackOffset < maxTrack) {
      nextState.buttons.set(ButtonAlias.right, new Style(Color.lightGray));
    }
    if (this.slotOffset > 0) {
      nextState.buttons.set(ButtonAlias.up, new Style(Color.lightGray));
    }
    if (this.slotOffset < maxSlot) {
      nextState.buttons.set(ButtonAlias.down, new Style(Color.lightGray));
    }

    let isTriggering = false;

    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 0)) {
      nextState.buttons.set(Button.row0, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 1)) {
      nextState.buttons.set(Button.row1, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 2)) {
      nextState.buttons.set(Button.row2, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 3)) {
      nextState.buttons.set(Button.row3, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 4)) {
      nextState.buttons.set(Button.row4, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 5)) {
      nextState.buttons.set(Button.row5, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 6)) {
      nextState.buttons.set(Button.row6, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 7)) {
      nextState.buttons.set(Button.row7, new Style(Color.green, Lighting.flashing));
      isTriggering = true;
    }

    if (isSessionView) {
      if (isMomentaryClearInputMode) {
        nextState.buttons.set(ButtonAlias.clear, new Style(Color.white));
      } else {
        nextState.buttons.set(ButtonAlias.clear, new Style(Color.gray));
      }
      if (isMomentaryDuplicateInputMode) {
        nextState.buttons.set(ButtonAlias.duplicate, new Style(Color.white));
      } else {
        nextState.buttons.set(ButtonAlias.duplicate, new Style(Color.gray));
      }
      if (isMomentaryQuantizeInputMode) {
        nextState.buttons.set(ButtonAlias.quantize, new Style(Color.white));
      } else {
        nextState.buttons.set(ButtonAlias.quantize, new Style(Color.gray));
      }
    }

    if (atom.hasFocusedClips()) {
      if (atom.hasRecordingTracks()) {
        nextState.buttons.set(ButtonAlias.arm, new Style(Color.red));
      } else {
        nextState.buttons.set(ButtonAlias.arm, new Style(Color.darkRed));
      }
    } else {
      if (atom.hasRecordingTracks()) {
        nextState.buttons.set(ButtonAlias.arm, new Style(Color.red, Lighting.flashing));
      } else {
        // noop
      }
    }

    if (isTriggering || atom.hasPlayingTracks()) {
      nextState.buttons.set(ButtonAlias.play, new Style(Color.green, Lighting.pulsing));
    } else {
      nextState.buttons.set(ButtonAlias.play, new Style(Color.lightGray));
    }

    switch (inputMode) {
      case MainInputMode.none:
        this.setNormalMode(nextState);
        break;
      case MainInputMode.stop:
        this.setStopMode(nextState);
        break;
      case MainInputMode.solo:
        this.setSoloMode(nextState);
        break;
      case MainInputMode.mute:
        this.setMuteMode(nextState);
        break;
      case MainInputMode.record:
        this.setRecordMode(nextState);
        break;
    }

    midi.emit(this.diff(this.viewState, nextState));
    this.viewState = nextState;
  }
  /**
   * Invoked when the view state needs to be populated in 'normal mode'.
   * @param {ViewState} nextState
   */
  setNormalMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_above + i;
      nextState.buttons.set(button, new Style(Color.lightGray));
    }

    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'stop mode'.
   * @param {ViewState} nextState
   */
  setStopMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_above + i;
      const color = atom.isAnyNotStoppedOnTrack(track) ? Color.red : Color.darkRed;
      const lighting = atom.isBulkReleasingOnTrack(track) ? Lighting.flashing : Lighting.static;
      nextState.buttons.set(button, new Style(color, lighting));
    }

    nextState.buttons.set(ButtonAlias.stop, new Style(Color.red));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'solo mode'.
   * @param {ViewState} nextState
   */
  setSoloMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_above + i;
      const color = atom.isAllSoloingOnTrack(track) ? Color.blue : Color.darkBlue;
      nextState.buttons.set(button, new Style(color));
    }

    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.blue));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'mute mode'.
   * @param {ViewState} nextState
   */
  setMuteMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_above + i;
      const color = atom.isAllMutedOnTrack(track) ? Color.darkYellow : Color.yellow;
      nextState.buttons.set(button, new Style(color));
    }

    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.yellow));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'record mode'.
   * @param {ViewState} nextState
   */
  setRecordMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_above + i;
      const color = atom.isAnyRecordingOnTrack(track) ? Color.red : Color.darkRed;
      nextState.buttons.set(button, new Style(color));
    }

    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.red));
  }

  // Other helpers

  /**
   * Gets the track coordinate for a track button.
   * Returns -1 if not the right type of button.
   * @param {BottomButton} button
   * @return {Number}
   */
  getTrackForButton(button) {
    if (button < BottomButton.col0_above) {
      return -1;
    }
    if (button > BottomButton.col7_above) {
      return -1;
    }
    const col = button - BottomButton.col0_above;
    return col + this.trackOffset;
  }
}

const controller = new LPProMk3();

// Atom: MIDI device configuration
// These constants are used by Atom for automatically connecting to this device.

/**
 * The ports on the device to listen for MIDI on.
 */
const INPUTS = ["LPProMK3 DAW", "LPProMK3 MIDI"];

/**
 * The ports on the device to send MIDI to.
 */
const OUTPUTS = ["LPProMK3 DAW"];

/**
 * Messages to send to the device when connecting.
 */
const CONNECT_MESSAGES = [...controller.enterDawModeMessage(), ...controller.requestLayoutMessage()];

/**
 * Messages to send to the device when disconnecting.
 */
const DISCONNECT_MESSAGES = [...controller.enterStandaloneModeMessage()];

// Atom: MIDI device callbacks
// These functions are called by Atom when various MIDI events occur.

/**
 * A MIDI Note ON message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onNoteOn(pitch, velocity, channel, timestamp, port) {
  if (velocity != 0) {
    controller.didPressPad(pitch, velocity, channel, timestamp);
  } else {
    controller.didUnpressPad(pitch, velocity, channel, timestamp);
  }
}

/**
 * A MIDI Note OFF message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onNoteOff(pitch, velocity, channel, timestamp, port) {
  controller.didUnpressPad(pitch, velocity, channel, timestamp);
}

/**
 * A MIDI CC message was received from the device.
 * @param {Number} cc
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onCc(cc, value, channel, timestamp, port) {
  if (value == 127) {
    controller.didPressButton(cc, value, channel, timestamp);
  } else if (value == 0) {
    controller.didUnpressButton(cc, value, channel, timestamp);
  }
}

/**
 * A MIDI Polyphonic Aftertouch message was received from the device.
 * @param {Number} pitch
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onPolyphonicAftertouch(pitch, pressure, channel, timestamp, port) {
  controller.didPolyphonicAftertouch(pitch, pressure, channel, timestamp);
}

/**
 * A MIDI Channel Aftertouch message was received from the device.
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onChannelAftertouch(pressure, channel, timestamp, port) {
  controller.didChannelAftertouch(pressure, channel, timestamp);
}

/**
 * A MIDI Pitch Bend message was received from the device.
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onPitchBend(value, channel, timestamp, port) {
  // noop
}

/**
 * A MIDI Program Change message was received from the device.
 * @param {Number} program
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onProgramChange(program, channel, timestamp, port) {
  // noop
}

/**
 * A MIDI SysEx message was received from the device.
 * @param {Array<Number>} message
 * @param {Number} timestamp
 * @param {String} port
 */
function onSysEx(message, timestamp, port) {
  const standaloneMode = Util.sysEx(controller.id, [SysEx.setMode, SysEx.standaloneMode]);
  const dawMode = Util.sysEx(controller.id, [SysEx.setMode, SysEx.dawMode]);
  const sessionLayout = Util.sysEx(controller.id, [SysEx.setLayout, SysEx.sessionLayout, 0, 0]);
  const noteLayout = Util.sysEx(controller.id, [SysEx.setLayout, SysEx.noteLayout, 0, 0]);
  const chordLayout = Util.sysEx(controller.id, [SysEx.setLayout, SysEx.chordLayout, 0, 0]);
  const customLayout = Util.sysEx(controller.id, [SysEx.setLayout, SysEx.customLayout]);
  const internalLayout = Util.sysEx(controller.id, [SysEx.setLayout]);
  if (Util.isEqual(message, standaloneMode)) {
    controller.didEnterStandaloneMode();
  } else if (Util.isEqual(message, dawMode)) {
    controller.didEnterDawMode();
  } else if (Util.isEqual(message, sessionLayout)) {
    controller.didSwitchToSessionLayout();
  } else if (Util.isEqual(message, noteLayout)) {
    controller.didSwitchToNoteLayout();
  } else if (Util.isEqual(message, chordLayout)) {
    controller.didSwitchToChordLayout();
  } else if (Util.isEqual(message.slice(0, 8), customLayout.slice(0, 8))) {
    controller.didSwitchToCustomLayout();
  } else if (Util.isEqual(message.slice(0, 7), internalLayout.slice(0, 7))) {
    controller.didSwitchToInternalLayout();
  }
}

// Atom: lifecycle callbacks
// These functions are called by Atom when various internal events occur.

/**
 * The play state of a clip has been updated.
 * @param {Number} track
 * @param {Number} slot
 */
function onUpdate(track, slot) {
  controller.update(track, slot);
}

/**
 * The controller must be updated.
 * @param {Boolean} clear Whether no previous state should be assumed.
 */
function onRender(clear) {
  controller.render(clear);
}
