import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import {
  getUserAssistants, getAssistantById, createAssistant, updateAssistant,
  deleteAssistant, countUserAssistants, attachFileToAssistant,
  detachFileFromAssistant, getAssistantFiles,
} from '../services/assistantService.js';
import { checkResourceLimit } from '../services/entitlementService.js';

const router = express.Router();

router.get('/assistants', authMiddleware, async (req, res) => {
  const assistants = await getUserAssistants(req.userId);
  res.json({ assistants });
});

router.post('/assistants', authMiddleware, async (req, res) => {
  const { name, instructions, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'اسم المساعد مطلوب' });

  const currentCount = await countUserAssistants(req.userId);
  const limitCheck = await checkResourceLimit(req.userId, 'custom_assistants', currentCount);
  if (!limitCheck.allowed) {
    const msg = limitCheck.limit === 0
      ? 'إنشاء المساعدين المخصصين غير متاح ضمن خطتك الحالية'
      : `وصلت للحد الأقصى من المساعدين (${limitCheck.limit}). رقّي لـPro لعدد غير محدود.`;
    return res.status(403).json({ error: msg, code: 'QUOTA_EXCEEDED', limit: limitCheck.limit });
  }

  try {
    const assistant = await createAssistant(req.userId, { name, instructions, description });
    res.json({ assistant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/assistants/:id', authMiddleware, async (req, res) => {
  const assistant = await getAssistantById(req.params.id, req.userId);
  if (!assistant) return res.status(404).json({ error: 'المساعد غير موجود' });
  const files = await getAssistantFiles(req.params.id, req.userId);
  res.json({ assistant, files });
});

router.patch('/assistants/:id', authMiddleware, async (req, res) => {
  try {
    const assistant = await updateAssistant(req.params.id, req.userId, req.body);
    res.json({ assistant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/assistants/:id', authMiddleware, async (req, res) => {
  try {
    await deleteAssistant(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assistants/:id/files', authMiddleware, async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId مطلوب' });

  try {
    const { supabase } = await import('../services/supabaseClient.js');
    const { data: fileRecord, error: fileErr } = await supabase
      .from('files').select('*').eq('id', fileId).eq('user_id', req.userId).single();
    if (fileErr || !fileRecord) return res.status(404).json({ error: 'الملف غير موجود' });

    let contentText = null;
    const supportedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
    ];

    if (supportedTypes.includes(fileRecord.type)) {
      const { data: fileBlob, error: dlErr } = await supabase.storage.from('user-files').download(fileRecord.storage_path);
      if (!dlErr && fileBlob) {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        if (fileRecord.type === 'application/pdf') {
          const { PDFParse } = await import('pdf-parse');
          const parser = new PDFParse({ data: buffer });
          const result = await parser.getText();
          await parser.destroy();
          contentText = result.text;
        } else {
          const mammoth = await import('mammoth');
          contentText = (await mammoth.extractRawText({ buffer })).value;
        }
      }
    }

    const attached = await attachFileToAssistant(req.params.id, req.userId, fileId, contentText);
    res.json({ attached });
  } catch (err) {
    console.error('Attach file to assistant error:', err);
    res.status(500).json({ error: err.message || 'حدث خطأ أثناء ربط الملف' });
  }
});

router.delete('/assistants/:id/files/:fileId', authMiddleware, async (req, res) => {
  try {
    await detachFileFromAssistant(req.params.id, req.userId, req.params.fileId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;