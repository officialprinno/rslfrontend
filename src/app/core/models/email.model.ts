export type EmailFolder = 'INBOX' | 'SENT' | 'DRAFT' | 'TRASH' | 'SPAM';
export type EmailDirection = 'INBOUND' | 'OUTBOUND';
export type EmailAccountType = 'PERSONAL' | 'SHARED';
export type ProvisioningStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ERROR' | 'DELETED';
export type MailboxPermission = 'READ' | 'SEND' | 'FULL';

export interface EmailAddress {
  name: string;
  email: string;
}

export interface EmailAccount {
  id: number;
  user_id: number | null;
  owner_id?: number | null;
  email_address: string;
  display_name: string;
  account_type?: EmailAccountType;
  home_company_id?: number | null;
  provisioning_status?: ProvisioningStatus;
  quota_mb?: number;
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
  last_sync_error?: string | null;
  created_at: string;
  access?: EmailAccountAccess[];
}

export interface EmailAccountAccess {
  id: number;
  email_account_id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  permission: MailboxPermission;
  is_active: boolean;
  granted_at: string;
}

export interface EmailAttachment {
  id: number;
  email_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  content_type: string;
  scan_status?: string;
}

export interface Label {
  id: number;
  user_id: number | null;
  name: string;
  color: string;
  emails_count: number;
  email_account_id?: number;
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
  snippet?: string;
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
  account_id?: number | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  body_html: string;
  /** Plain-text counterpart of body_html (used by Sent/read pane). */
  body_text?: string;
  attachments?: File[];
  reply_to_id?: number | null;
  forward_of_id?: number | null;
  scheduled_at?: string | null;
}

export interface SyncResult {
  synced: number;
  new_emails: number;
  errors: number;
  last_synced: string | null;
  started?: boolean;
  skipped?: boolean;
  detail?: string;
}

export interface PollResult {
  account_id: number | null;
  last_synced: string | null;
  unread_inbox: number;
  message_count: number;
  latest_received_at: string | null;
  has_changes: boolean;
  new_emails?: number;
  sync_error?: string | null;
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
  account_id?: number;
}

export interface MailboxProvisionData {
  account_type: EmailAccountType;
  owner_id?: number | null;
  email_address?: string;
  display_name?: string;
  home_company_id?: number | null;
  quota_mb?: number;
  access_user_ids?: number[];
}
