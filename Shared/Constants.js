/**
 * Various MIDI constants.
 */
const Constants = {
  kNoteOff: 0x80,
  kNoteOn: 0x90,
  kPolyphonicAftertouch: 0xa0,
  kControlChange: 0xb0,
  kProgramChange: 0xc0,
  kChannelAftertouch: 0xd0,
  kPitchBendRange: 0xe0,
  kSysEx: 0xf0,
  kEndOfSysEx: 0xf7,
  kBeatClock: 0xf8,

  kSustainPedal: 0x40,
  kAllNotesOff: 0x7b,
};
