export type ConversationType = 'DIRECT' | 'GROUP' | 'BROADCAST';
export type MessageType = 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM' | 'BROADCAST';
export type MessagePriority = 'NORMAL' | 'HIGH' | 'URGENT';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';
export type NotificationType = 'MESSAGE' | 'BROADCAST' | 'APPROVAL' | 'ALERT' | 'SYSTEM';

export interface ConversationParticipant {
  user_id: number;
  full_name: string;
  role_name: string;
  department_name: string;
  is_admin: boolean;
  is_muted: boolean;
  is_online: boolean;
}

export interface MessageAttachment {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_url: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  body: string;
  message_type: MessageType;
  priority: MessagePriority;
  reply_to_id: number | null;
  reply_to_preview: string | null;
  attachments: MessageAttachment[];
  read_by: number[];
  status: MessageStatus;
  created_at: string;
  is_deleted: boolean;
  is_starred?: boolean;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  participants: ConversationParticipant[];
  last_message: Message | null;
  unread_count: number;
  is_muted: boolean;
  created_at: string;
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  icon: string;
  color: string;
  reference_type: string | null;
  reference_id: number | null;
  navigate_to: string | null;
  is_read: boolean;
  created_at: string;
}

export interface BroadcastData {
  subject: string;
  body: string;
  recipients_type: 'ALL' | 'DEPARTMENT' | 'CUSTOM';
  department_id?: number | null;
  user_ids?: number[];
  priority: MessagePriority;
}

export interface SendMessageData {
  body: string;
  message_type?: MessageType;
  priority?: MessagePriority;
  reply_to_id?: number | null;
}

export interface TypingEvent {
  user_id: number;
  conversation_id: number;
}

export interface OnlineStatusEvent {
  user_id: number;
}
