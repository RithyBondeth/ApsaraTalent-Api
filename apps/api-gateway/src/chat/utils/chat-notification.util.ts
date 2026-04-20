export function buildChatNotificationPreview(params: {
  messageType: string;
  content: string;
  hasAttachment: boolean;
  attachmentFilename?: string | null;
}): string {
  const type = (params.messageType || 'text').toLowerCase();

  if (type === 'audio') return 'Audio message';
  if (type === 'image') return 'Photo';
  if (type === 'document') return params.attachmentFilename || 'Attachment';
  if (type === 'call') return 'Call';

  const trimmed = params.content?.trim() ?? '';
  if (!trimmed && params.hasAttachment)
    return params.attachmentFilename || 'Attachment';
  if (!trimmed) return 'New message';

  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed;
}
