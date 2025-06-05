export type TChatPayload = {
  receiverId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
};

export type TChatContent = {
  senderId: string;
  receiverId: string;
  content: string;
  type: string;
};
