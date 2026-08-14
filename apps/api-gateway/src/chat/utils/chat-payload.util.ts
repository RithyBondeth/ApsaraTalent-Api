import { CHAT } from '@app/contracts/constants/domain/chat.constant';

/**
 * Payload validation for the chat socket handlers.
 *
 * Each function returns the client-facing error message, or null when the
 * payload is acceptable. Keeping these out of the gateway means the rules are
 * testable without a Socket.IO server, and the handlers stay focused on
 * transport: emit the error, or carry on.
 */

/** Validates a send-message payload, including the empty/attachment rule. */
export function validateSendMessage(
  dto: {
    receiverId?: unknown;
    content?: string;
    attachment?: unknown;
    type?: string;
  } | null,
  validMessageTypes: readonly string[],
): string | null {
  if (!dto?.receiverId || typeof dto.receiverId !== 'string') {
    return 'Invalid message payload: missing receiverId';
  }

  const trimmedContent = dto.content?.trim() ?? '';
  if (trimmedContent.length > CHAT.MAX_MESSAGE_LENGTH) {
    return `Message must be at most ${CHAT.MAX_MESSAGE_LENGTH} characters`;
  }
  if (!trimmedContent && !dto.attachment) {
    return 'Message cannot be empty';
  }
  if (!validMessageTypes.includes(dto.type ?? 'text')) {
    return 'Invalid message type';
  }
  return null;
}

/** Validates an edit-message payload; the new content may not be empty. */
export function validateEditMessage(
  dto: { messageId?: unknown; newContent?: string } | null,
): string | null {
  if (!dto?.messageId || typeof dto.messageId !== 'string') {
    return 'messageId is required';
  }
  const trimmed = dto.newContent?.trim();
  if (!trimmed || trimmed.length > CHAT.MAX_MESSAGE_LENGTH) {
    return `Message must be 1–${CHAT.MAX_MESSAGE_LENGTH} characters`;
  }
  return null;
}
