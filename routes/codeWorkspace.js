import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { config } from '../config/env.js';
import { createSnippet, completeSnippet, failSnippet, getUserSnippets, deleteSnippet, deleteAllUserSnippets } from '../services/codeWorkspaceService.js';

const router = express.Router();
const MAX_CODE_LENGTH = 15000;

const ACTION_PROMPTS = {
  generate: (input, lang) => lang === 'en' ? `Write code for this request. Include the code in a fenced code block with the correct language tag, and a brief explanation after.\n\nRequest: ${input}` : `اكتب كودًا لهذا الطلب. ضع الكود بصندوق كود مع تحديد اللغة، وشرح موجز بعده.\n\nالطلب: ${input}`,
  explain: (input, lang) => lang === 'en' ? `Explain what this code does, step by step, in clear terms:\n\n${input}` : `اشرح ماذا يفعل هذا الكود، خطوة بخطوة، بشكل واضح:\n\n${input}`,
  debug: (input, lang) => lang === 'en' ? `Find and fix any bugs in this code. Show the corrected code in a code block, then briefly explain what was wrong:\n\n${input}` : `اكتشف وأصلح أي أخطاء بهذا الكود. أظهر الكود المصحح بصندوق كود، ثم اشرح باختصار شو كانت المشكلة:\n\n${input}`,
  convert: (input, lang) => lang === 'en' ? `Convert this code to the target language mentioned at the start of the input (or ask to specify if unclear), showing the result in a code block:\n\n${input}` : `حوّل هذا الكود للغة الهدف المذكورة ببداية الطلب، وأظهر النتيجة بصندوق كود:\n\n${input}`,
};

router.post('/code-workspace/run', authMiddleware, async (req, res) => {
  try {
    const { action, code, title, language, lang } = req.body;
    if (!ACTION_PROMPTS[action]) return res.status(400).json({ error: 'نوع إجراء غير صالح' });
    if (!code || !code.trim()) return res.status(400).json({ error: 'الرجاء إدخال الكود أو الطلب' });
    if (code.length > MAX_CODE_LENGTH) return res.status(400).json({ error: 'النص طويل جدًا' });

    const record = await createSnippet({ userId: req.userId, title: (title || action).slice(0, 100), language, inputCode: code.trim(), action });
    const prompt = ACTION_PROMPTS[action](code.trim(), lang);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
    });

    const data = await groqResponse.json();
    if (data.error) { await failSnippet(record.id); return res.status(502).json({ error: 'فشل المعالجة' }); }

    const resultText = data.choices?.[0]?.message?.content?.trim() || '';
    const completed = await completeSnippet(record.id, resultText);
    res.json({ snippet: completed });
  } catch (err) {
    console.error('Code workspace error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

router.get('/code-workspace', authMiddleware, async (req, res) => {
  res.json({ snippets: await getUserSnippets(req.userId) });
});

router.delete('/code-workspace', authMiddleware, async (req, res) => {
  try { await deleteAllUserSnippets(req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/code-workspace/:id', authMiddleware, async (req, res) => {
  try { await deleteSnippet(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;