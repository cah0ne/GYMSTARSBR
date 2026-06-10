export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'post' | 'score' | 'live' | 'chat';
  link: string;
  createdAt: number;
  readBy?: string[];
  senderId?: string;
}
