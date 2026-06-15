export type EmailFolder = 'INBOX' | 'SENT' | 'DRAFT' | 'TRASH' | 'SPAM';
export type EmailDirection = 'INBOUND' | 'OUTBOUND';

export interface EmailAddress {
  name: string;
  email: string;
}

export interface EmailAccount {
  id: number;
  user_id: number;
  email_address: string;
  display_name: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  username: string;
  sync_frequency: number;
  sync_days: number;
  max_per_sync: number;
  is_active: boolean;
  last_synced: string | null;
  created_at: string;
}

export interface EmailAttachment {
  id: number;
  email_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  content_type: string;
}

export interface Label {
  id: number;
  user_id: number;
  name: string;
  color: string;
  emails_count: number;
}

export interface Email {
  id: number;
  email_account_id: number;
  message_id: string;
  direction: EmailDirection;
  from_address: string;
  from_name: string;
  to_addresses: EmailAddress[];
  cc_addresses: EmailAddress[];
  bcc_addresses: EmailAddress[];
  subject: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  folder: EmailFolder;
  thread_id: string | null;
  thread_count: number;
  labels: Label[];
  attachments: EmailAttachment[];
  has_attachments: boolean;
  received_at: string;
  created_at: string;
  linked_customer_id?: number | null;
  linked_supplier_id?: number | null;
}

export interface ComposeEmailData {
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  body_html: string;
  attachments?: File[];
  reply_to_id?: number | null;
  forward_of_id?: number | null;
  scheduled_at?: string | null;
}

export interface SyncResult {
  synced: number;
  new_emails: number;
  errors: number;
  last_synced: string;
}

export interface ConnectionTest {
  imap_success: boolean;
  imap_error: string | null;
  smtp_success: boolean;
  smtp_error: string | null;
  success: boolean;
}

export interface EmailFilters {
  folder?: EmailFolder;
  unread?: boolean;
  starred?: boolean;
  has_attachment?: boolean;
  search?: string;
  label?: number;
  sort?: 'date' | 'from' | 'subject';
  page?: number;
  page_size?: number;
}
