import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import {
  createWorkflow, getUserWorkflows, getWorkflowById, deleteWorkflow,
  createRun, completeRun, failRun, getUserRuns, deleteRun, deleteAllUserRuns,
} from '../services/workflowService.js';

const router = express.Router();
const MAX_STEPS = 6;
const MAX_INPUT_LENGTH = 8000;

router.post('/workflows', authMiddleware, async (req, res) => {
  try {
    const { name, steps } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم سير العمل مطلوب' });
    if (!Array.isArray(steps) || !steps.length) return res.status(400).json({ error: 'يجب إضافة خطوة واحدة على الأقل' });
    if (steps.length > MAX_STEPS) return res.status(400).json({ error: `الحد الأقصى ${MAX_STEPS} خطوات` });
    const workflow = await createWorkflow({ userId: req.userId, name: name.trim(), steps });
    res.json({ workflow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/workflows', authMiddleware, async (req, res) => {
  res.json({ workflows: await getUserWorkflows(req.userId) });
});

router.delete('/workflows/:id', authMiddleware, async (req, res) => {
  try { await deleteWorkflow(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/workflows/:id/run', authMiddleware, async (req, res) => {
  try {
    const { inputText } = req.body;
    if (!inputText || !inputText.trim()) return res.status(400).json({ error: 'الرجاء إدخال نص البداية' });
    if (inputText.length > MAX_INPUT_LENGTH) return res.status(400).json({ error: 'النص طويل جدًا' });

    const workflow = await getWorkflowById(req.params.id, req.userId);
    if (!workflow) return res.status(404).json({ error: 'سير العمل غير موجود' });

    const run = await createRun({ userId: req.userId, workflowId: workflow.id, workflowName: workflow.name, inputText: inputText.trim() });

    let currentInput = inputText.trim();
    const stepResults = [];

    for (const step of workflow.steps) {
      const prompt = `${step.instruction}\n\n---\n${currentInput}`;
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await groqResponse.json();
      if (data.error) {
        await failRun(run.id);
        return res.status(502).json({ error: `فشلت الخطوة: ${step.instruction}` });
      }
      const output = data.choices?.[0]?.message?.content?.trim() || '';
      stepResults.push({ instruction: step.instruction, output });
      currentInput = output;
    }

    const completed = await completeRun(run.id, stepResults);
    res.json({ run: completed });
  } catch (err) {
    console.error('Workflow run error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/workflows/runs/history', authMiddleware, async (req, res) => {
  res.json({ runs: await getUserRuns(req.userId) });
});

router.delete('/workflows/runs/history', authMiddleware, async (req, res) => {
  try { await deleteAllUserRuns(req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/workflows/runs/history/:id', authMiddleware, async (req, res) => {
  try { await deleteRun(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;