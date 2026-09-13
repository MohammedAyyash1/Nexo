import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import {
  getUserProjects, getProjectById, createProject, updateProject, deleteProject,
  countUserProjects, attachFileToProject, detachFileFromProject, getProjectFiles,
} from '../services/projectService.js';
import { checkResourceLimit } from '../services/entitlementService.js';

const router = express.Router();

router.get('/projects', authMiddleware, async (req, res) => {
  const projects = await getUserProjects(req.userId);
  res.json({ projects });
});

router.post('/projects', authMiddleware, async (req, res) => {
  const { name, instructions, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'اسم المشروع مطلوب' });

  const currentCount = await countUserProjects(req.userId);
  const limitCheck = await checkResourceLimit(req.userId, 'projects', currentCount);
  if (!limitCheck.allowed) {
    const msg = limitCheck.limit === 0
      ? 'إنشاء المشاريع غير متاح ضمن خطتك الحالية'
      : `وصلت للحد الأقصى من المشاريع (${limitCheck.limit}). رقّي لـPro لعدد غير محدود.`;
    return res.status(403).json({ error: msg, code: 'QUOTA_EXCEEDED', limit: limitCheck.limit });
  }

  try {
    const project = await createProject(req.userId, { name, instructions, description });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id', authMiddleware, async (req, res) => {
  const project = await getProjectById(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'المشروع غير موجود' });
  const files = await getProjectFiles(req.params.id, req.userId);
  res.json({ project, files });
});

router.patch('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await updateProject(req.params.id, req.userId, req.body);
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:id', authMiddleware, async (req, res) => {
  try {
    await deleteProject(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/files', authMiddleware, async (req, res) => {
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

    const attached = await attachFileToProject(req.params.id, req.userId, fileId, contentText);
    res.json({ attached });
  } catch (err) {
    console.error('Attach file to project error:', err);
    res.status(500).json({ error: err.message || 'حدث خطأ أثناء ربط الملف' });
  }
});

router.delete('/projects/:id/files/:fileId', authMiddleware, async (req, res) => {
  try {
    await detachFileFromProject(req.params.id, req.userId, req.params.fileId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;