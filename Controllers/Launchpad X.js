// This file implements functionality for the Launchpad X controller.
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
 * Additional device-specific constants aliasing buttons.
 */
ButtonAlias.up = Button.col0;
ButtonAlias.down = Button.col1;
ButtonAlias.left = Button.col2;
ButtonAlias.right = Button.col3;
ButtonAlias.note = Button.col5;
ButtonAlias.custom = Button.col6;
ButtonAlias.arm = Button.col7;
ButtonAlias.stop = Button.row4;
ButtonAlias.solo = Button.row6;
ButtonAlias.mute = Button.row5;
ButtonAlias.record = Button.row7;

/**
 * Implementation-specific constants describing the current view mode.
 */
const ViewMode = {
  note: 1,
  custom: 2,
  session: 3,
  mixer: 4,
};

/**
 * Implementation-specific constants describing the current mixer input mode.
 */
const MixerInputMode = {
  none: 1,
  stop: 2,
  solo: 3,
  mute: 4,
  record: 5,
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
    this.inputMode = MixerInputMode.none;
    this.stopping = new Set(); // Set<TrackSlotPad>
  }
}

/**
 * Launchpad X controller.
 */
class LPX extends LaunchpadMk3 {
  /**
   * Constructs a Launchpad X controller instance.
   */
  constructor() {
    super([0x00, 0x20, 0x29, 0x02, 0x0c]);
    this.controllerState = new ControllerState();
  }

  // Custom device callbacks

  /**
   * Invoked when a pad is pressed.
   * @param {Number} pitch
   * @param {Number} velocity
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didPressPad(pitch, velocity, channel, timestamp) {
    const { viewMode, inputMode, stopping } = this.controllerState;
    const [row, _] = this.getRowAndCol(pitch);
    const [track, slot] = this.getTrackAndSlot(pitch);
    const clip = atom.getClipOnTrackAndSlot(track, slot);

    const isSessionView = viewMode == ViewMode.session;
    const isMixerView = viewMode == ViewMode.mixer;
    const isNoteView = viewMode == ViewMode.note;
    const isCustomView = viewMode == ViewMode.custom;
    const isNormalInputMode = inputMode == MixerInputMode.none;
    const isStopInputMode = inputMode == MixerInputMode.stop;
    const isSoloInputMode = inputMode == MixerInputMode.solo;
    const isMuteInputMode = inputMode == MixerInputMode.mute;
    const isRecordInputMode = inputMode == MixerInputMode.record;
    const isBottomRow = row == Layout.rows - 1;

    if (isNoteView || isCustomView) {
      atom.receiveNoteOn(pitch, velocity, channel, timestamp);
      return;
    }

    if (isMixerView && isRecordInputMode && !isBottomRow) {
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

    if (isSessionView || (isMixerView && (isNormalInputMode || !isBottomRow))) {
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

    if (isMixerView && isRecordInputMode && atom.hasClipOnTrack(track)) {
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
  }

  /**
   * Invoked when a pad is depressed.
   * @param {Number} pitch
   * @param {Number} velocity
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didUnpressPad(pitch, velocity, channel, timestamp) {
    const { viewMode, inputMode } = this.controllerState;
    const [row, _] = this.getRowAndCol(pitch);
    const [track, slot] = this.getTrackAndSlot(pitch);
    const clip = atom.getClipOnTrackAndSlot(track, slot);

    const isSessionView = viewMode == ViewMode.session;
    const isMixerView = viewMode == ViewMode.mixer;
    const isNoteView = viewMode == ViewMode.note;
    const isCustomView = viewMode == ViewMode.custom;
    const isNormalInputMode = inputMode == MixerInputMode.none;
    const isBottomRow = row == Layout.rows - 1;

    if (isNoteView || isCustomView) {
      atom.receiveNoteOff(pitch, velocity, channel, timestamp);
      return;
    }

    if (isSessionView || (isMixerView && (isNormalInputMode || !isBottomRow))) {
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

    const isSessionView = viewMode == ViewMode.session;
    const isMixerView = viewMode == ViewMode.mixer;
    const isStopInputMode = inputMode == MixerInputMode.stop;
    const isSoloInputMode = inputMode == MixerInputMode.solo;
    const isMuteInputMode = inputMode == MixerInputMode.mute;
    const isRecordInputMode = inputMode == MixerInputMode.record;

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

    if (button == ButtonAlias.session) {
      if (isSessionView) {
        this.controllerState.viewMode = ViewMode.mixer;
      } else {
        this.controllerState.viewMode = ViewMode.session;
      }
      this.render();
      return;
    }

    if (button == ButtonAlias.note) {
      this.controllerState.viewMode = ViewMode.note;
      this.render();
      return;
    }

    if (button == ButtonAlias.custom) {
      this.controllerState.viewMode = ViewMode.custom;
      this.render();
      return;
    }

    if (button == Button.row0 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 0));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 0);
      this.render();
      return;
    }

    if (button == Button.row1 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 1));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 1);
      this.render();
      return;
    }

    if (button == Button.row2 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 2));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 2);
      this.render();
      return;
    }

    if (button == Button.row3 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 3));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 3);
      this.render();
      return;
    }

    if (button == Button.row4 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 4));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 4);
      this.render();
      return;
    }

    if (button == Button.row5 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 5));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 5);
      this.render();
      return;
    }

    if (button == Button.row6 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 6));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 6);
      this.render();
      return;
    }

    if (button == Button.row7 && isSessionView) {
      const tracks = atom.getAllPlayingTracks();
      const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 7));
      Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
      atom.launchScene(this.slotOffset + 7);
      this.render();
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

    if (button == ButtonAlias.stop && isMixerView) {
      if (isStopInputMode) {
        this.controllerState.inputMode = MixerInputMode.none;
      } else {
        this.controllerState.inputMode = MixerInputMode.stop;
      }
      this.render();
      return;
    }

    if (button == ButtonAlias.solo && isMixerView) {
      if (isSoloInputMode) {
        this.controllerState.inputMode = MixerInputMode.none;
      } else {
        this.controllerState.inputMode = MixerInputMode.solo;
      }
      this.render();
      return;
    }

    if (button == ButtonAlias.mute && isMixerView) {
      if (isMuteInputMode) {
        this.controllerState.inputMode = MixerInputMode.none;
      } else {
        this.controllerState.inputMode = MixerInputMode.mute;
      }
      this.render();
      return;
    }

    if (button == ButtonAlias.record && isMixerView) {
      if (isRecordInputMode) {
        this.controllerState.inputMode = MixerInputMode.none;
      } else {
        this.controllerState.inputMode = MixerInputMode.record;
      }
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

    if (viewMode == ViewMode.note || viewMode == ViewMode.custom) {
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

    if (viewMode == ViewMode.note || viewMode == ViewMode.custom) {
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
    const { viewMode, inputMode, stopping } = this.controllerState;
    const [maxTrack, maxSlot] = atom.getMaxTrackAndSlot();

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
      const track = clip.getTrack();
      const slot = clip.getSlot();
      const [row, col] = this.getPadCoords(track, slot);
      const pad = new RowColPad(row, col);
      const color = this.getColor(clip);
      const lighting = this.getLighting(clip);
      nextState.pads.set(pad.id, new Style(color, lighting));
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

    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 0)) {
      nextState.buttons.set(Button.row0, new Style(Color.green, Lighting.flashing));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 1)) {
      nextState.buttons.set(Button.row1, new Style(Color.green, Lighting.flashing));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 2)) {
      nextState.buttons.set(Button.row2, new Style(Color.green, Lighting.flashing));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 3)) {
      nextState.buttons.set(Button.row3, new Style(Color.green, Lighting.flashing));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 4)) {
      nextState.buttons.set(Button.row4, new Style(Color.green, Lighting.flashing));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 5)) {
      nextState.buttons.set(Button.row5, new Style(Color.green, Lighting.flashing));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 6)) {
      nextState.buttons.set(Button.row6, new Style(Color.green, Lighting.flashing));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 7)) {
      nextState.buttons.set(Button.row7, new Style(Color.green, Lighting.flashing));
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

    switch (`${viewMode} ${inputMode}`) {
      case `${ViewMode.mixer} ${MixerInputMode.none}`:
        this.setMixerNormalMode(nextState);
        break;
      case `${ViewMode.mixer} ${MixerInputMode.stop}`:
        this.setMixerStopMode(nextState);
        break;
      case `${ViewMode.mixer} ${MixerInputMode.solo}`:
        this.setMixerSoloMode(nextState);
        break;
      case `${ViewMode.mixer} ${MixerInputMode.mute}`:
        this.setMixerMuteMode(nextState);
        break;
      case `${ViewMode.mixer} ${MixerInputMode.record}`:
        this.setMixerRecordMode(nextState);
        break;
    }

    midi.emit(this.diff(this.viewState, nextState));
    this.viewState = nextState;
  }

  /**
   * Invoked when the view state needs to be populated in 'normal mode'.
   * @param {ViewState} nextState
   */
  setMixerNormalMode(nextState) {
    nextState.buttons.set(ButtonAlias.session, new Style(Color.lightOrange));
    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'stop mode'.
   * @param {ViewState} nextState
   */
  setMixerStopMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const pad = new RowColPad(Layout.rows - 1, i);
      const color = atom.isAnyNotStoppedOnTrack(track) ? Color.red : Color.darkRed;
      const lighting = atom.isBulkReleasingOnTrack(track) ? Lighting.flashing : Lighting.static;
      nextState.pads.set(pad.id, new Style(color, lighting));
    }

    nextState.buttons.set(ButtonAlias.session, new Style(Color.lightOrange));
    nextState.buttons.set(ButtonAlias.stop, new Style(Color.red));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'solo mode'.
   * @param {ViewState} nextState
   */
  setMixerSoloMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const pad = new RowColPad(Layout.rows - 1, i);
      const color = atom.isAllSoloingOnTrack(track) ? Color.blue : Color.darkBlue;
      nextState.pads.set(pad.id, new Style(color));
    }

    nextState.buttons.set(ButtonAlias.session, new Style(Color.lightOrange));
    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.blue));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'mute mode'.
   * @param {ViewState} nextState
   */
  setMixerMuteMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const pad = new RowColPad(Layout.rows - 1, i);
      const color = atom.isAllMutedOnTrack(track) ? Color.darkYellow : Color.yellow;
      nextState.pads.set(pad.id, new Style(color));
    }

    nextState.buttons.set(ButtonAlias.session, new Style(Color.lightOrange));
    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.yellow));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'record mode'.
   * @param {ViewState} nextState
   */
  setMixerRecordMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const pad = new RowColPad(Layout.rows - 1, i);
      const color = atom.isAnyRecordingOnTrack(track) ? Color.red : Color.darkRed;
      nextState.pads.set(pad.id, new Style(color));
    }

    nextState.buttons.set(ButtonAlias.session, new Style(Color.lightOrange));
    nextState.buttons.set(ButtonAlias.stop, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.solo, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.mute, new Style(Color.lightGray));
    nextState.buttons.set(ButtonAlias.record, new Style(Color.red));
  }
}

const controller = new LPX();

// Atom: MIDI device configuration
// These constants are used by Atom for automatically connecting to this device.

/**
 * The ports on the device to listen for MIDI on.
 */
const INPUTS = ["LPX DAW Out", "LPX MIDI Out"];

/**
 * The ports on the device to send MIDI to.
 */
const OUTPUTS = ["LPX DAW In"];

/**
 * Messages to send to the device when connecting.
 */
const CONNECT_MESSAGES = [...controller.enterDawModeMessage()];

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
  if (Util.isEqual(message, standaloneMode)) {
    controller.didEnterStandaloneMode();
  } else if (Util.isEqual(message, dawMode)) {
    controller.didEnterDawMode();
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
