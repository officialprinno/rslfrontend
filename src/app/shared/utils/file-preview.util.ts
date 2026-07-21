export type FilePreviewKind = 'pdf' | 'image' | 'unsupported';

export function filePreviewKind(filename: string, mimeType = ''): FilePreviewKind {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  if (ext === '.pdf' || mimeType === 'application/pdf') return 'pdf';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  return 'unsupported';
}
