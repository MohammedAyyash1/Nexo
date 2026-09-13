import { FileText, X } from 'lucide-react';

export function AttachmentChip({ attachment, onRemove, t }) {
  if (!attachment) return null;
  const isLoading = attachment.kind === 'loading';
  return (
    <div className="attachment-chip">
      {attachment.kind === 'image' ? (
        <img src={attachment.dataUrl} alt={attachment.name} className="attachment-thumb" />
      ) : (
        <FileText size={16} />
      )}
      <span className="attachment-name">
        {attachment.name}
        {isLoading && <span className="attachment-loading"> — {t.loadingFile || '...'}</span>}
      </span>
      {!isLoading && (
        <button className="attachment-remove" onClick={onRemove} title={t.removeAttachment}>
          <X size={12} />
        </button>
      )}
    </div>
  );
}