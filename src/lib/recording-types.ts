// Single source of truth for the BC3 recording types this codebase
// knows how to capture, audit, and clean up. If you add one (e.g.,
// 'Document'), every consumer (id-store, leak-audit, cleanup script)
// picks it up automatically — and the compiler tells you which
// switch statements you forgot to extend.

export const RECORDING_TYPES = [
  'Todo',
  'Todolist',
  'Message',
  'Comment',
  'Schedule::Entry',
] as const;

export type RecordingType = typeof RECORDING_TYPES[number];
