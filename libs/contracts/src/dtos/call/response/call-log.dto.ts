/** Internal payload for logging call events as chat messages */
export class CallLogResponseDTO {
  senderId: string;
  receiverId: string;
  content: string;

  constructor(partial: Partial<CallLogResponseDTO>) {
    Object.assign(this, partial);
  }
}
