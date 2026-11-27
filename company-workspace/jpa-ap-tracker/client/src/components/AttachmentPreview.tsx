import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, attachmentUrl, errorMessage, type Attachment, type Payable } from '../api';
import { ErrorBox, Modal } from '../components';
import { useLedger } from '../ledger';

/** Lists attachments; loads each image only when the user clicks to view it. */
export function AttachmentPreview({
  payable,
  onClose,
}: {
  payable: Pick<Payable, 'id' | 'client_name' | 'invoice_no'>;
  onClose: () => void;
}) {
  const ledger = useLedger();
  const [viewing, setViewing] = useState<Attachment | null>(null);
  const detail = useQuery({
    queryKey: ['ledger', ledger.kind, 'detail', payable.id],
    queryFn: () => api.get<Payable>(`${ledger.apiBase}/${payable.id}`),
  });

  return (
    <Modal title={`Invoice files - ${payable.client_name} ${payable.invoice_no ?? ''}`} onClose={onClose}>
      {detail.isLoading && <p>Loading...</p>}
      {detail.error && <ErrorBox error={errorMessage(detail.error)} />}
      {detail.isSuccess && !detail.data.attachments?.length && <p className="muted">No files attached.</p>}

      <ul className="attachment-file-list">
        {detail.data?.attachments?.map((a) => (
          <li key={a.id}>
            {a.mime.startsWith('image/') ? (
              <button type="button" className="btn small" onClick={() => setViewing(a)}>
                View {a.original_name}
              </button>
            ) : (
              <a href={attachmentUrl(a.id)} target="_blank" rel="noreferrer" className="btn small">
                Open {a.original_name}
              </a>
            )}
          </li>
        ))}
      </ul>

      {viewing && (
        <div className="attachment-viewer">
          <div className="attachment-viewer-header">
            <strong>{viewing.original_name}</strong>
            <button type="button" className="btn ghost small" onClick={() => setViewing(null)}>
              Close image
            </button>
          </div>
          <a href={attachmentUrl(viewing.id)} target="_blank" rel="noreferrer">
            <img src={attachmentUrl(viewing.id)} alt={viewing.original_name} className="preview-img" />
          </a>
        </div>
      )}
    </Modal>
  );
}
