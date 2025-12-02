export const ErrorCodes = {
  // Room errors
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_ALREADY_ARCHIVED: 'ROOM_ALREADY_ARCHIVED',
  ROOM_ALREADY_DELETED: 'ROOM_ALREADY_DELETED',
  NOT_ROOM_PARTICIPANT: 'NOT_ROOM_PARTICIPANT',
  ALREADY_ROOM_PARTICIPANT: 'ALREADY_ROOM_PARTICIPANT',
  CANNOT_REMOVE_LAST_PARTICIPANT: 'CANNOT_REMOVE_LAST_PARTICIPANT',

  // Message errors
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  MESSAGE_ALREADY_DELETED: 'MESSAGE_ALREADY_DELETED',
  NOT_MESSAGE_SENDER: 'NOT_MESSAGE_SENDER',
  EMPTY_MESSAGE_CONTENT: 'EMPTY_MESSAGE_CONTENT',

  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // General errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

export const ErrorMessages = {
  [ErrorCodes.ROOM_NOT_FOUND]: 'Chat room not found',
  [ErrorCodes.ROOM_ALREADY_ARCHIVED]: 'Chat room is already archived',
  [ErrorCodes.ROOM_ALREADY_DELETED]: 'Chat room has been deleted',
  [ErrorCodes.NOT_ROOM_PARTICIPANT]: 'You are not a participant of this room',
  [ErrorCodes.ALREADY_ROOM_PARTICIPANT]: 'User is already a participant of this room',
  [ErrorCodes.CANNOT_REMOVE_LAST_PARTICIPANT]: 'Cannot remove the last participant from room',

  [ErrorCodes.MESSAGE_NOT_FOUND]: 'Message not found',
  [ErrorCodes.MESSAGE_ALREADY_DELETED]: 'Message has been deleted',
  [ErrorCodes.NOT_MESSAGE_SENDER]: 'You are not the sender of this message',
  [ErrorCodes.EMPTY_MESSAGE_CONTENT]: 'Message content cannot be empty',

  [ErrorCodes.FILE_NOT_FOUND]: 'File not found',
  [ErrorCodes.FILE_UPLOAD_FAILED]: 'File upload failed',
  [ErrorCodes.FILE_TOO_LARGE]: 'File size exceeds maximum limit',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type',

  [ErrorCodes.UNAUTHORIZED]: 'Unauthorized',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
