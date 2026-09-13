import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Volume2, Square, Globe, Info, FileText, FileDown, RotateCw, Pencil, Star } from 'lucide-react';
import { exportMessageAsWord, exportMessageAsPdf, deriveTitleFromContent } from '../utils/exportDoc.js';
import { useState } from 'react';

export function Message({ m, i, t, copiedIndex, handleCopy, speakingIndex, handleToggleSpeak, lang, isLast, onContinue, loading, onEdit, onRegenerate, isFavorited, onToggleFavorite }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(m.content);
  const isUser = m.role === 'user';

  const saveEdit = () => {
    if (editText.trim() && editText.trim() !== m.content) onEdit(i, editText.trim());
    setEditing(false);
  };
  const handleExportWord = () => exportMessageAsWord(m.content, deriveTitleFromContent(m.content), lang);
  const handleExportPdf = () => exportMessageAsPdf(m.content, deriveTitleFromContent(m.content), lang);

  return (
    <div className={`msg-row-v3 ${m.role}`}>
      <div className="msg-avatar">{isUser ? (t.brand?.[0] || 'U') : 'N'}</div>
      <div className={`msg-content-col ${isUser ? 'user-align' : ''}`}>
        {m.image && <img src={m.image} alt="attachment" className="bubble-image" />}
        <div className={`bubble ${m.role}`}>
          {editing ? (
            <div>
              <textarea
                value={editText} onChange={(e) => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: 60, background: 'var(--bg-input-2)', color: 'inherit', border: '1px solid var(--border-input)', borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 'inherit' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="settings-btn" onClick={saveEdit} style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }}>{lang === 'en' ? 'Save & Resend' : 'حفظ وإعادة الإرسال'}</button>
                <button className="settings-btn" onClick={() => { setEditing(false); setEditText(m.content); }} style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }}>{lang === 'en' ? 'Cancel' : 'إلغاء'}</button>
              </div>
            </div>
          ) : m.role === 'assistant' ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          ) : (
            m.content
          )}
        </div>

        {m.role === 'assistant' && m.content && (
          m.usedSearch ? (
            <div className="msg-info-note used-search">
              <Globe size={12} />
              {lang === 'en' ? 'Based on current web information' : 'استنادًا إلى معلومات حديثة من الويب'}
            </div>
          ) : (
            <div className="msg-info-note">
              <Info size={12} />
              {lang === 'en' ? 'Based on internal knowledge — may not be up to date' : 'استنادًا إلى معرفة النموذج الداخلية — قد لا تكون محدّثة'}
            </div>
          )
        )}

        {m.role === 'assistant' && !editing && (
          <div className="msg-actions msg-actions-hover">
            <button className="msg-action-btn" onClick={() => handleCopy(m.content, i)} title={t.copy}>
              {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button className="msg-action-btn" onClick={() => handleToggleSpeak(m.content, i)} title="استماع">
              {speakingIndex === i ? <Square size={13} /> : <Volume2 size={14} />}
            </button>
            <button className="msg-action-btn" onClick={handleExportWord} title={lang === 'en' ? 'Export as Word' : 'تصدير Word'}>
              <FileText size={14} />
            </button>
            <button className="msg-action-btn" onClick={handleExportPdf} title={lang === 'en' ? 'Export as PDF' : 'تصدير PDF'}>
              <FileDown size={14} />
            </button>
            {onRegenerate && !loading && (
              <button className="msg-action-btn" onClick={() => onRegenerate(i)} title={lang === 'en' ? 'Regenerate' : 'إعادة توليد'}>
                <RotateCw size={14} />
              </button>
            )}
            {onToggleFavorite && m.id && (
              <button className="msg-action-btn" onClick={() => onToggleFavorite(m)} title={lang === 'en' ? 'Favorite' : 'مفضلة'}>
                <Star size={14} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        )}

        {m.role === 'user' && !editing && onEdit && (
          <div className="msg-actions msg-actions-hover">
            <button className="msg-action-btn" onClick={() => setEditing(true)} title={lang === 'en' ? 'Edit' : 'تعديل'}>
              <Pencil size={14} />
            </button>
          </div>
        )}

        {m.role === 'assistant' && m.truncated && isLast && !loading && (
          <button
            onClick={onContinue}
            style={{
              marginTop: 6, alignSelf: 'flex-start', background: 'rgba(var(--accent-rgb), 0.12)',
              border: '1px solid rgba(var(--accent-rgb), 0.3)', color: 'var(--text-primary)',
              padding: '6px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
            }}
          >
            {lang === 'en' ? '↓ Continue response' : '↓ إكمال الرد'}
          </button>
        )}
      </div>
    </div>
  );
}