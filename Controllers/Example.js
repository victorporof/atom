// This file is a template for scripting a custom controller.
// Documentation: https://github.com/victorporof/atom

/* VERSION 1 */
/* global atom, midi */

/* import "Shared/Helpers.js" */
/* global Util */

// Atom: MIDI device configuration
// These constants are used by Atom for automatically connecting to this device.

/**
 * The ports on the device to listen for MIDI on.
 */
const INPUTS = [
  // Example:
  // "LPProMK3 DAW", "LPProMK3 MIDI"
];

/**
 * The ports on the device to send MIDI to.
 */
const OUTPUTS = [
  // Example:
  // "LPProMK3 DAW"
];

/**
 * Messages to send to the device when connecting.
 */
const CONNECT_MESSAGES = [
  // Example:
  // 0xf0, 0x00, 0x20, 0x29, 0x02, 0x0d, 0x10, 0x01, 0xf7
];

/**
 * Messages to send to the device when disconnecting.
 */
const DISCONNECT_MESSAGES = [
  // Example:
  // 0xf0, 0x00, 0x20, 0x29, 0x02, 0x0d, 0x10, 0x00, 0xf7
];

// Atom: MIDI device callbacks
// These functions are called by Atom when various MIDI events occur.

/**
 * A MIDI Note ON message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onNoteOn(pitch, velocity, channel, timestamp) {
  // Example:
  // const track = 0;
  // const slot = 0;
  // const clip = atom.getClipOnTrackAndSlot(track, slot);
  // if (clip != null && !clip.isLaunched()) {
  //   atom.launchClip(track, slot);
  // } else {
  //   atom.stopTrack(track);
  // }
}

/**
 * A MIDI Note OFF message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onNoteOff(pitch, velocity, channel, timestamp) {
  // TODO
}

/**
 * A MIDI CC message was received from the device.
 * @param {Number} cc
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onCc(cc, value, channel, timestamp) {
  // TODO
}

/**
 * A MIDI Polyphonic Aftertouch message was received from the device.
 * @param {Number} pitch
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onPolyphonicAftertouch(pitch, pressure, channel, timestamp) {
  // TODO
}

/**
 * A MIDI Channel Aftertouch message was received from the device.
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onChannelAftertouch(pressure, channel, timestamp) {
  // TODO
}

/**
 * A MIDI Pitch Bend message was received from the device.
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onPitchBend(value, channel, timestamp) {
  // TODO
}

/**
 * A MIDI Program Change message was received from the device.
 * @param {Number} program
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onProgramChange(program, channel, timestamp) {
  // TODO
}

/**
 * A MIDI SysEx message was received from the device.
 * @param {Array<Number>} message
 * @param {Number} timestamp
 */
function onSysEx(message, timestamp) {
  // TODO
}

// Atom: lifecycle callbacks
// These functions are called by Atom when various internal events occur.

/**
 * The play state of a clip has been updated.
 * @param {Number} track
 * @param {Number} slot
 */
function onUpdate(track, slot) {
  // TODO
}

/**
 * The controller must be updated.
 * @param {Boolean} clear Whether no previous state should be assumed.
 */
function onRender(clear) {
  // TODO
}
