// This file implements functionality for the MPK Mini 3 controller.
// To customize this controller, disable and duplicate this script.

/* VERSION 1 */
/* global atom, midi */

/* import "Shared/Helpers.js" */
/* global Util */

// Atom: MIDI device configuration
// These constants are used by Atom for automatically connecting to this device.

/**
 * The ports on the device to listen for MIDI on.
 */
const INPUTS = ["MPK mini 3"];

/**
 * The ports on the device to send MIDI to.
 */
const OUTPUTS = ["MPK mini 3"];

/**
 * Messages to send to the device when connecting.
 */
const CONNECT_MESSAGES = [];

/**
 * Messages to send to the device when disconnecting.
 */
const DISCONNECT_MESSAGES = [];

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
  atom.receiveNoteOn(pitch, velocity, channel, timestamp);
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
  atom.receiveNoteOff(pitch, velocity, channel, timestamp);
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
  atom.receiveCC(cc, value, channel, timestamp);
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
  atom.receivePolyphonicAftertouch(pitch, pressure, channel, timestamp);
}

/**
 * A MIDI Channel Aftertouch message was received from the device.
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onChannelAftertouch(pressure, channel, timestamp, port) {
  atom.receiveChannelAftertouch(pressure, channel, timestamp);
}

/**
 * A MIDI Pitch Bend message was received from the device.
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onPitchBend(value, channel, timestamp, port) {
  atom.receivePitchBend(value, channel, timestamp);
}

/**
 * A MIDI Program Change message was received from the device.
 * @param {Number} program
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onProgramChange(program, channel, timestamp, port) {
  atom.receiveProgramChange(program, channel, timestamp);
}

/**
 * A MIDI SysEx message was received from the device.
 * @param {Array<Number>} message
 * @param {Number} timestamp
 * @param {String} port
 */
function onSysEx(message, timestamp, port) {
  // noop
}

// Atom: lifecycle callbacks
// These functions are called by Atom when various internal events occur.

/**
 * The play state of a clip has been updated.
 * @param {Number} track
 * @param {Number} slot
 */
function onUpdate(track, slot) {
  // noop
}

/**
 * The controller must be updated.
 * @param {Boolean} clear Whether no previous state should be assumed.
 */
function onRender(clear) {
  // noop
}
