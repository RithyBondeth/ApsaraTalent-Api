export interface IChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  reactions: Record<string, string>;
  sentAt: Date;
  /** True when sender deleted the message (soft-delete tombstone) */
  isDeleted?: boolean;
  /**
   * True when the sender has edited the message after sending.
   * Shown as a small "(edited)" label in the bubble.
   */
  isEdited?: boolean;
  /** UUID of the message being quoted/replied to, or null for top-level messages */
  replyToId?: string | null;
  /** URL of an uploaded file or image attachment */
  attachment?: string | null;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
  attachmentDuration?: number | null;
  attachmentAmplitude?: number[] | null;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Minimal typings for WebRTC signalling objects.
 * These mirror the browser's RTCSessionDescriptionInit and RTCIceCandidateInit
 * interfaces so NestJS DTOs stay fully typed without requiring @types/webrtc.
 */

/** Shape of an RTCSessionDescriptionInit — carries the SDP offer or answer. */
export interface RtcSessionDescription {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

/** Shape of an RTCIceCandidateInit — carries network path candidates. */
export interface RtcIceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}
