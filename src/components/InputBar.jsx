import { Plus, Mic, Square, Send } from 'lucide-react';
import { AttachmentChip } from './AttachmentChip.jsx';

export function InputBar({
  welcome, attachment, fileError, input, setInput, handleKeyDown,
  handleSend, loading, t, fileInputRef, removeAttachment,
  isRecording, toggleRecording,
}) {
  return (
    <div className="composer-v3-wrap">
      <div className="composer-v3">
        <AttachmentChip attachment={attachment} onRemove={removeAttachment} t={t} />
        {fileError && <div className="attachment-error">{fileError}</div>}
        <div className="composer-v3-row">
          <button className="plus-btn" onClick={() => fileInputRef.current?.click()} title={t.attach}>
            <Plus size={18} />
          </button>
          <textarea
            rows={1}
            placeholder={t.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`icon-btn ${isRecording ? 'recording' : ''}`}
            title={t.voice}
            onClick={toggleRecording}
            type="button"
          >
            {isRecording ? <Square size={16} /> : <Mic size={18} />}
          </button>
          <button className="composer-v3-send" onClick={handleSend} disabled={loading} title={t.send}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}