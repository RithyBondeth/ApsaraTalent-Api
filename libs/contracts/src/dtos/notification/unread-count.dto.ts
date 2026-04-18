
export class UnreadCountResponseDTO {
  unreadCount: number;

    constructor(partial: Partial<UnreadCountResponseDTO>) {
        Object.assign(this, partial);
    }
}

export class UnreadCountDTO {}
