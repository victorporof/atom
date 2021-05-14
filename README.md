# Atom Piano Roll 2.0

[![CC BY-SA 4.0][cc-by-sa-shield]][cc-by-sa]

Atom 2 lets you extend it with your own code. You can control hardware devices, adding support for new controllers or completely changing the behavior of existing ones (e.g. Launchpad X).

Programming is done in JS. All code runs in a sandbox, asynchronously, without blocking the audio thread.

## License

This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License][cc-by-sa].

[![CC BY-SA 4.0][cc-by-sa-image]][cc-by-sa]

[cc-by-sa]: http://creativecommons.org/licenses/by-sa/4.0/
[cc-by-sa-image]: https://licensebuttons.net/l/by-sa/4.0/88x31.png
[cc-by-sa-shield]: https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg

## Adding scripts

To register a script, add your JS file to the "Shared" or "Controllers" subdirectories in the Atom folder.

JS files in the "Controllers" subdirectory can then be enabled or disabled from Atom's UI.

## Reusing code

Where it makes sense, make sure to reuse code and avoid needless duplication.

Scripts placed in the "Shared" folder can be imported with an `/* import */` pragma (which looks like a comment). You cannot import scripts from anywhere else.

Example:

```js
/* import "Shared/Helpers.js" */
/* global Util */
```

An `/* import */` pragma will include all code from the specified file. To help others who might be reading your code, it is recommended (but not required) to also specify which globals are used from the imported file, using `/* global */` comments.

## MIDI device configuration

The following constants are used by Atom for automatically connecting to a device (or virtual MIDI port). You must add all of them at the top-level of your script. You can usually find port names in any host's MIDI routing matrix when the device is physically connected.

- `INPUTS`

The device ports on which to listen for MIDI. An array of strings.

Example:

```js
// Receive MIDI from the `DAW Out` and `MIDI Out` ports of the Launchpad Mini Mk3 controller.
const INPUTS = ["LPMiniMK3 DAW Out", "LPMiniMK3 MIDI Out"];
```

- `OUTPUTS`

The device ports on which to send MIDI. An array of strings.

Example:

```js
// Send MIDI to the `DAW In` port of the Launchpad Mini Mk3 controller.
const OUTPUTS = ["LPMiniMK3 DAW In"];
```

- `CONNECT_MESSAGES`

Messages to automatically send to the device as soon as it's connected. An array of numbers.

Example:

```js
// Sends a `SysEx` message that enters "DAW mode" when the Launchpad Mini Mk3 controller is connected.
const CONNECT_MESSAGES = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0d, 0x10, 0x01, 0xf7];
```

- `DISCONNECT_MESSAGES`

Messages to automatically send to the device just before it's disconnected. An array of numbers.

Example:

```js
// Sends a `SysEx` message that exits "DAW mode" when the Launchpad Mini Mk3 controller is disconnected.
const DISCONNECT_MESSAGES = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0d, 0x10, 0x00, 0xf7];
```

## MIDI device callbacks

The following functions are called by Atom when various MIDI events occur. You must add any of them at the top-level of your script. Make sure the device is correctly identified with the `INPUTS` and `OUTPUTS` constants (check out the documentation in the previous section for more info).

- `onNoteOn`

Global function invoked when a `Note On` MIDI event is received from the controller. The `pitch`, `velocity` and `channel` arguments are numbers ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization.

Example:

```js
/**
 * A MIDI Note ON message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onNoteOn(pitch, velocity, channel, timestamp, port) {}
```

- `onNoteOff`

Global function invoked when a `Note Off` MIDI event is received from the controller. The `pitch`, `velocity` and `channel` arguments are numbers ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization. The `port` argument specifies the device port name (not label).

Example:

```js
/**
 * A MIDI Note OFF message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onNoteOff(pitch, velocity, channel, timestamp, port) {}
```

- `onCc`

Global function invoked when a `CC` MIDI event is received from the controller. The `cc`, `value` and `channel` arguments are numbers ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization. The `port` argument specifies the device port name (not label).

Example:

```js
/**
 * A MIDI CC message was received from the device.
 * @param {Number} cc
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onCc(cc, value, channel, timestamp, port) {}
```

- `onPolyphonicAftertouch`

Global function invoked when a `Polyphonic Aftertouch` MIDI event is received from the controller. The `pitch`, `pressure` and `channel` arguments are numbers ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization. The `port` argument specifies the device port name (not label).

Example:

```js
/**
 * A MIDI Polyphonic Aftertouch message was received from the device.
 * @param {Number} pitch
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onPolyphonicAftertouch(pitch, pressure, channel, timestamp, port) {}
```

- `onChannelAftertouch`

Global function invoked when a `Channel Aftertouch` MIDI event is received from the controller. The `pressure` and `channel` arguments are numbers ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization. The `port` argument specifies the device port name (not label).

Example:

```js
/**
 * A MIDI Channel Aftertouch message was received from the device.
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onChannelAftertouch(pressure, channel, timestamp, port) {}
```

- `onPitchBend`

Global function invoked when a `Pitch Bend` MIDI event is received from the controller. The `value` argument is a number that represents a 14-bit MIDI word. The `channel` argument is a number ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization. The `port` argument specifies the device port name (not label).

Example:

```js
/**
 * A MIDI Pitch Bend message was received from the device.
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onPitchBend(value, channel, timestamp, port) {}
```

- `onProgramChange`

Global function invoked when a `PC` MIDI event is received from the controller. The `program` and `channel` arguments are numbers ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization. The `port` argument specifies the device port name (not label).

Example:

```js
/**
 * A MIDI Program Change message was received from the device.
 * @param {Number} program
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onProgramChange(program, channel, timestamp, port) {}
```

- `onSysEx`

Global function invoked when a `SysEx` MIDI event is received from the controller. The `message` argument is an array of numbers ranging from 0 to 255. The `timestamp` argument is an opaque number that can be passed to other API functions for synchronization. The `port` argument specifies the device port name (not label).

Example:

```js
/**
 * A MIDI SysEx message was received from the device.
 * @param {Array<Number>} message
 * @param {Number} timestamp
 * @param {String} port
 */
function onSysEx(message, timestamp, port) {}
```

## Lifecycle callbacks

The following functions are called by Atom when various internal events occur. You must add any of them at the top-level of your script.

- `onUpdate`

Global function invoked when a clip's play state has been updated. The `track` and `slot` arguments are numbers starting from 0. A clip's play state has 4 different possible states: for more granular checks, see `isStopped`, `willStart`, `isPlaying` and `willStop` on the `atom.Clip` API.

Example:

```js
/**
 * The play state of a clip has been updated.
 * @param {Number} track
 * @param {Number} slot
 */
function onUpdate(track, slot) {}
```

- `onRender`

Global function that may be invoked in the sandbox at any time. Signals that the controller must be updated for any reason (e.g.: during initialization, when a clip's track and slot has changed, or when a clip's play state has been updated). The `clear` argument is a boolean specifying whether no previous state should be assumed (e.g.: during initialization, or a reset).

Example:

```js
/**
 * The controller must be updated.
 * @param {Boolean} clear Whether no previous state should be assumed.
 */
function onRender(clear) {}
```

## Standard library

### `midi`

A global namespace that provides functions used to communicate with the device configured by this script. Make sure the device is correctly identified with the `INPUTS` and `OUTPUTS` constants (check out the documentation in the previous section for more info).

- `emit(message: Array<Number>)`

Sends a MIDI message to the device. The `message` argument must be an array of numbers ranging from 0 to 255. Usually used to send `SysEx` messages.

Example:

```js
// Sends a `SysEx` message to the controller.
midi.emit([0xf0, 0x00, 0x20, 0x29, 0x02, 0x0d, 0x00, 0x00, 0xf7]);
```

### `atom.Clip`

A type of object representing the state of a clip. Created by functions in the `atom` global namespace, such as `getClips` or `getClipOnTrackAndSlot` (check out the documentation in the next section for more info).

- `getTrack() -> Int`

Gets the track index ("column") associated with a clip.

Example:

```js
let clips = atom.getClips();
for (let clip of clips) {
  let trackIndex = clip.getTrack(); // a number starting from 0
}
```

- `getSlot() -> Int`

Gets the slot index ("row") associated with a clip.

Example:

```js
let slotIndex = clip.getSlot(); // a number starting from 0
```

- `getColor() -> Int`

Gets the color index associated with a clip. The color palette has 9 possible colors.

Example:

```js
let colorIndex = clip.getColor(); // a number between 0 and 8
```

- `isRecording() -> Bool`

Gets whether or not the clip is armed for recording.

Example:

```js
if (clip.isRecording()) {
  // armed
}
```

- `isLaunched() -> Bool`

Gets whether or not the clip is launched. A clip is "launched" when it is currently "playing", or "triggering" (scheduled to start in a few beats as specified by the selected quantum).

Example:

```js
if (clip.isLaunched()) {
  // playing or triggering
}
```

Similarly, a clip is "not launched" when it is currently "stopped" or "releasing" (scheduled to stop in a few beats as specified by the selected quantum).

Example:

```js
if (!clip.isLaunched()) {
  // stopped or releasing
}
```

A clip's play state has 4 different possible states: for more granular checks, see `isStopped`, `willStart`, `isPlaying` and `willStop` on the `atom.Clip` API.

- `isStopped() -> Bool`

Gets whether or not the clip is stopped. A clip is "stopped" when it is completely stopped, i.e. not "playing", not "triggering" (scheduled to start) and not "releasing" (scheduled to stop).

Example:

```js
if (clip.isStopped()) {
  // stopped
}
```

- `willStart() -> Bool`

Gets whether or not the clip is triggering. A clip is "triggering" when it is scheduled to start soon, i.e. not "playing" yet, not "stopped" and not "releasing" (scheduled to stop).

Example:

```js
if (clip.willStart()) {
  // triggering...
}
```

- `isPlaying() -> Bool`

Gets whether or not the clip is playing. A clip is "playing" when it is actively playing, i.e. not "stopped", not "triggering" (scheduled to start) and not "releasing" (scheduled to stop).

Example:

```js
if (clip.isPlaying()) {
  // playing
}
```

- `willStop() -> Bool`

Gets whether or not the clip is releasing. A clip is "releasing" when it is scheduled to stop soon, i.e. not "stopped" yet, not "playing" and not "triggering" (scheduled to start).

Example:

```js
if (clip.willStop()) {
  // releasing...
}
```

- `getNoteOnLaunchBehavior() -> String?`

Gets the user preference for this clip's behavior when the particular `Note On` MIDI event that should toggle the clip's launch state is received. The possible values are as follows:

#### `"noop"`

No operation should happen.

#### `"unlaunched:trigger, launched:noop"`

If the clip is not launched, it should trigger.
If the clip was already launched (i.e. "triggering" or "playing"), nothing should happen.

#### `"unlaunched:noop, launched:retrigger"`

If the clip is not launched, nothing should happen.
If the clip was already launched (i.e. "triggering" or "playing"), it should re-trigger (i.e. stop and trigger).

#### `"unlaunched:noop, launched:release"`

If the clip is not launched, nothing should happen.
If the clip was already launched (i.e. "triggering" or "playing"), it should release.

#### `"unlaunched:trigger, launched:retrigger"` (Also known as "Ableton mode")

If the clip is not launched, it should trigger.
If the clip was already launched (i.e. "triggering" or "playing"), it should re-trigger (i.e. stop and trigger).

#### `"unlaunched:trigger, launched:release"` (Also known as "Launchpad mode")

If the clip is not launched, it should trigger.
If the clip was already launched (i.e. "triggering" or "playing"), it should release.

Example:

```js
switch (clip.getNoteOnLaunchBehavior()) {
  ...
}
```

- `getNoteOffLaunchBehavior() -> String?`

Gets the user preference for this clip's behavior when the particular `Note Off` MIDI event that should toggle the clip's launch state is received. See above for the possible values.

Example:

```js
switch (clip.getNoteOffLaunchBehavior()) {
  ...
}
```

### `atom`

A global namespace that provides functions used to control Atom itself. For example, you can call these in response to MIDI events coming from the controller.

In all situations related to launching or arming, the following rules apply:

1. When arming a clip, if the clip is not yet playing, it will trigger.
2. When stopping a clip, if the clip is armed, it will be disarmed.

The API is as follows:

- `launchScene(slot: Int)`

Triggers all clips assigned to a slot. Releases all clips on other slots. The `slot` argument is a number starting from 0.

Example:

```js
atom.launchScene(0);
```

- `stopTrack(track: Int)`

Releases all clips assigned to a track. The `track` argument is a number starting from 0.

Example:

```js
atom.stopTrack(0);
```

- `launchClip(track: Int, slot: Int)`

Triggers the clip assigned to a track and slot. If the choke mode chosen by the user is "auto" or "on", releases all clips on other slots on that track. The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.launchClip(0, 1);
```

- `stopClip(track: Int, slot: Int)`

Releases the clip assigned to a track and slot. The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.stopClip(0, 1);
```

- `soloTrack(track: Int)`

Un-mutes all clips assigned to a track. Mutes all clips on other tracks. The `track` argument is a number starting from 0.

Example:

```js
atom.soloTrack(0);
```

- `unsoloTrack(track: Int)`

Un-mutes all clips not assigned to a track. The `track` argument is a number starting from 0.

Example:

```js
atom.unsoloTrack(0);
```

- `muteTrack(track: Int)`

Mutes all clips assigned to a track. The `track` argument is a number starting from 0.

Example:

```js
atom.muteTrack(0);
```

- `unmuteTrack(track: Int)`

Un-mutes all clips assigned to a track. The `track` argument is a number starting from 0.

Example:

```js
atom.unmuteTrack(0);
```

- `armClip(track: Int, slot: Int)`

Arms the clip assigned to a track and slot. The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.armClip(0, 1);
```

- `disarmClip(track: Int, slot: Int)`

Disarms the clip assigned to a track and slot. The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.disarmClip(0, 1);
```

- `armScene(slot: Int)`

Arms all clips assigned to a slot. The `slot` argument is a number starting from 0.

Example:

```js
atom.armScene(0);
```

- `disarmTrack(track: Int)`

Disarms all clips assigned to a track. The `track` argument is a number starting from 0.

Example:

```js
atom.disarmTrack(0);
```

- `clearActivePattern(track: Int, slot: Int)`

Clears the active pattern within a clip (deletes all notes without removing pattern). The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.clearActivePattern(0, 1);
```

- `addEmptyActivePattern(track: Int, slot: Int)`

Adds an empty active pattern within a clip (creates and selects a new pattern with similar settings to the active one, but with no MIDI notes or events). The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.addEmptyActivePattern(0, 1);
```

- `duplicateActivePattern(track: Int, slot: Int)`

Duplicates the active pattern within a clip (creates and selects a new pattern identical to the active one). The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.duplicateActivePattern(0, 1);
```

- `toggleQuantization(track: Int, slot: Int)`

Toggles quantization when recording for a given clip. The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
atom.toggleQuantization(0, 1);
```

- `receiveNoteOn(pitch: UInt8, velocity: UInt8, channel: UInt8, timestamp: Int)`

Injects a `Note On` MIDI event, as if it were coming through regular MIDI routing. Clips that are "focused" or "armed" will receive this event, other clips will ignore it. Clips are automatically focused when their view becomes visible. The `pitch`, `velocity` and `channel` arguments are numbers between 0 and 255. The `timestamp` argument is an opaque number that comes from the other API functions for synchronization.

Example:

```js
atom.receiveNoteOn(60, 100, 0, 0);
```

- `receiveNoteOff(pitch: UInt8, velocity: UInt8, channel: UInt8, timestamp: Int)`

Injects a `Note Off` MIDI event, as if it were coming through regular MIDI routing. Clips that are "focused" or "armed" will receive this event, other clips will ignore it. Clips are automatically focused when their view becomes visible. The `pitch`, `velocity` and `channel` arguments are numbers between 0 and 255. The `timestamp` argument is an opaque number that comes from the other API functions for synchronization.

Example:

```js
atom.receiveNoteOff(60, 100, 0, 0);
```

- `receiveCC(cc: UInt8, value: UInt8, channel: UInt8, timestamp: Int)`

Injects a `CC` MIDI event, as if it were coming through regular MIDI routing. Clips that are "focused" or "armed" will receive this event, other clips will ignore it. Clips are automatically focused when their view becomes visible. The `cc`, `value` and `channel` arguments are numbers between 0 and 255. The `timestamp` argument is an opaque number that comes from the other API functions for synchronization.

Example:

```js
atom.receiveCC(0, 100, 0, 0);
```

- `receivePolyphonicAftertouch(pitch: UInt8, pressure: UInt8, channel: UInt8, timestamp: Int)`

Injects a `Polyphonic Aftertouch` MIDI event, as if it were coming through regular MIDI routing. Clips that are "focused" or "armed" will receive this event, other clips will ignore it. Clips are automatically focused when their view becomes visible. The `pitch`, `pressure` and `channel` arguments are numbers between 0 and 255. The `timestamp` argument is an opaque number that comes from the other API functions for synchronization.

Example:

```js
atom.receivePolyphonicAftertouch(60, 100, 0, 0);
```

- `receiveChannelAftertouch(pressure: UInt8, channel: UInt8, timestamp: Int)`

Injects a `Channel Aftertouch` MIDI event, as if it were coming through regular MIDI routing. Clips that are "focused" or "armed" will receive this event, other clips will ignore it. Clips are automatically focused when their view becomes visible. The `pressure` and `channel` arguments are numbers between 0 and 255. The `timestamp` argument is an opaque number that comes from the other API functions for synchronization.

Example:

```js
atom.receiveChannelAftertouch(100, 0, 0);
```

- `receivePitchBend(value: UInt16, channel: UInt8, timestamp: Int)`

Injects a `Pitch Bend` MIDI event, as if it were coming through regular MIDI routing. Clips that are "focused" or "armed" will receive this event, other clips will ignore it. Clips are automatically focused when their view becomes visible. The `value` argument is a number that must be a 14-bit MIDI word. The `channel` argument is a number between 0 and 255. The `timestamp` argument is an opaque number that comes from the other API functions for synchronization.

Example:

```js
atom.receivePitchBend(8192, 0, 0);
```

- `receiveProgramChange(program: UInt8, channel: UInt8, timestamp: Int)`

Injects a `Program Change` MIDI event, as if it were coming through regular MIDI routing. Clips that are "focused" or "armed" will receive this event, other clips will ignore it. Clips are automatically focused when their view becomes visible. The `program` and `channel` arguments are numbers between 0 and 255. The `timestamp` argument is an opaque number that comes from the other API functions for synchronization.

Example:

```js
atom.receiveProgramChange(8, 0, 0);
```

- `getClips() -> [atom.Clip]`

Gets all clips as `atom.Clip` instances, on which functions such as `getTrack`, `getSlot` or `isLaunched` are available (check out the documentation in the previous section for more info). If there are no clips available, an empty array is returned.

Example:

```js
let clips = atom.getClips(); // an array of `atom.Clip` instances
```

- `getClipOnTrackAndSlot(track: Int, slot: Int) -> atom.Clip?`

Gets the clip on a track and slot as a `atom.Clip` instance. If there is no clip with those coords, `null` is returned. The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
let clip = atom.getClipOnTrackAndSlot(0, 1); // a `atom.Clip` instance
```

- `hasClipOnTrack(track: Int) -> Bool`

Convenience function for checking whether there is any clip on a track. The `track` argument is a number starting from 0.

Example:

```js
let hasClip = atom.hasClipOnTrack(0); // true or false
```

- `hasClipOnSlot(slot: Int) -> Bool`

Convenience function for checking whether there is any clip on a slot. The `slot` argument is a number starting from 0.

Example:

```js
let hasClip = atom.hasClipOnSlot(0); // true or false
```

- `hasClipOnTrackAndSlot(track: Int, slot: Int) -> Bool`

Convenience function for checking whether there is any clip on a track and slot. The `track` and `slot` arguments are numbers starting from 0.

Example:

```js
let hasClip = atom.hasClipOnTrackAndSlot(0, 1); // true or false
```

- `getMaxTrackAndSlot() -> [Int]`

Convenience function for getting the maximum track and maximum slot of all clips. The returned values are numbers starting from 0.

Example:

```js
let [track, slot] = atom.getMaxTrackAndSlot(); // a pair of numbers starting from 0
```

- `getClipWithLowestSlotOnTrack(track: Int) -> atom.Clip?`

Convenience function for getting the clip with the lowest ("bottomest") slot on a track as a `atom.Clip` instance. If there is no clip with those coords, `null` is returned. The `track` argument is a number starting from 0.

Example:

```js
let clip = atom.getClipWithLowestSlotOnTrack(0); // a `atom.Clip` instance
```

- `getLaunchedClipWithLowestSlotOnTrack(track: Int) -> atom.Clip?`

Convenience function for getting the launched clip ("triggering" or "playing") with the lowest ("bottomest") slot on a track as a `atom.Clip` instance. If there is no launched clip with those coords, `null` is returned. The `track` argument is a number starting from 0.

Example:

```js
let clip = atom.getLaunchedClipWithLowestSlotOnTrack(0); // a `atom.Clip` instance
```

- `getAllPlayingTracks() -> [Int]`

Convenience function for getting the track indices for all clips currently "playing". Check out the `isPlaying` function for more info on what "playing" means.

Example:

```js
let tracks = atom.getAllPlayingTracks(); // an array of numbers starting from 0
```

- `hasPlayingTracks() -> Bool`

Convenience function for checking whether there is any clip currently "playing" on any track. Check out the `isPlaying` function for more info on what "playing" means.

Example:

```js
let hasPlaying = atom.hasPlayingTracks(); // true or false
```

- `getAllFocusedClips() -> [atom.Clip]`

Convenience function for getting all clips currently focused (visible) as `atom.Clip` instances.

Example:

```js
let clips = atom.getAllFocusedClips(); // an array of `atom.Clip` instances
```

- `hasFocusedClips() -> Bool`

Convenience function for checking whether there is any clip currently focused (visible).

Example:

```js
let hasFocused = atom.hasFocusedClips(); // true or false
```

- `getAllRecordingTracks() -> [Int]`

Convenience function for getting the track indices for all clips currently armed (recording).

Example:

```js
let tracks = atom.getAllRecordingTracks(); // an array of numbers starting from 0
```

- `hasRecordingTracks() -> Bool`

Convenience function for checking whether there is any clip currently armed (recording) on any track.

Example:

```js
let hasRecording = atom.hasRecordingTracks(); // true or false
```

- `isAnyTriggeringOnTrack(track: Int) -> Bool`

Convenience function for checking whether there is any clip currently triggering on a track. The `track` argument is a number starting from 0. Check out the `willStart` function for more info on what "triggering" means.

Example:

```js
let anyWillStart = atom.isAnyTriggeringOnTrack(0); // true or false
```

- `isAnyReleasingOnTrack(track: Int) -> Bool`

Convenience function for checking whether there is any clip currently releasing on a track. The `track` argument is a number starting from 0. Check out the `willStop` function for more info on what "releasing" means.

Example:

```js
let anyWillStop = atom.isAnyReleasingOnTrack(0); // true or false
```

- `isAnyPlayingOnTrack(track: Int) -> Bool`

Convenience function for checking whether there is any clip currently playing on a track. The `track` argument is a number starting from 0. Check out the `isPlaying` function for more info on what "playing" means.

Example:

```js
let anyIsPlaying = atom.isAnyPlayingOnTrack(0); // true or false
```

- `isAnyNotStoppedOnTrack(track: Int) -> Bool`

Convenience function for checking whether there is any clip not currently stopped on a track. The `track` argument is a number starting from 0. Check out the `isStopped` function for more info on what "stopped" means.

Example:

```js
let noneAreStopped = atom.isAnyNotStoppedOnTrack(0); // true or false
```

- `isAllMutedOnTrack(track: Int) -> Bool`

Convenience function for checking whether all clips are currently muted on a track. The `track` argument is a number starting from 0.

Example:

```js
let isTrackMuted = atom.isAllMutedOnTrack(0); // true or false
```

- `isAllSoloingOnTrack(track: Int) -> Bool`

Convenience function for checking whether all clips are currently soloing on a track (i.e. all clips on this track are un-muted, and all clips on other tracks are muted). The `track` argument is a number starting from 0.

Example:

```js
let isTrackSoloing = atom.isAllSoloingOnTrack(0); // true or false
```

- `isAnyRecordingOnTrack(track: Int) -> Bool`

Convenience function for checking whether there is any clip currently armed on a track. The `track` argument is a number starting from 0.

Example:

```js
let isTrackRecording = atom.isAnyRecordingOnTrack(0); // true or false
```

- `isBulkTriggeringOnSlot(slot: Int) -> Bool`

Convenience function for checking if a scene is triggering. The `slot` argument is a number starting from 0. Check out the `willStart` function for more info on what "triggering" means.

Example:

```js
let isSceneTriggering = atom.isBulkTriggeringOnSlot(0); // true or false
```

- `isBulkReleasingOnTrack(track: Int) -> Bool`

Convenience function for checking if a track is releasing. The `track` argument is a number starting from 0. Check out the `willStop` function for more info on what "releasing" means.

Example:

```js
let isTrackReleasing = atom.isBulkReleasingOnTrack(0); // true or false
```
