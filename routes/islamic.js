import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { calculateZakat } from '../services/islamic/zakatCalculator.js';
import { calculateInheritance } from '../services/islamic/inheritanceCalculator.js';
import { saveCalculation, getUserCalculations, deleteCalculation, deleteAllUserCalculations } from '../services/islamicCalcService.js';

const router = express.Router();

router.post('/islamic/zakat', authMiddleware, async (req, res) => {
  try {
    const result = calculateZakat(req.body);
    const saved = await saveCalculation({ userId: req.userId, calcType: 'zakat', inputs: req.body, result });
    res.json({ calculation: saved });
  } catch (err) {
    console.error('Zakat calculation error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء الحساب' });
  }
});

router.post('/islamic/inheritance', authMiddleware, async (req, res) => {
  try {
    if (!req.body.estateValue || req.body.estateValue <= 0) {
      return res.status(400).json({ error: 'قيمة التركة مطلوبة ويجب أن تكون أكبر من صفر' });
    }
    const result = calculateInheritance(req.body);
    const saved = await saveCalculation({ userId: req.userId, calcType: 'inheritance', inputs: req.body, result });
    res.json({ calculation: saved });
  } catch (err) {
    console.error('Inheritance calculation error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء الحساب' });
  }
});

router.get('/islamic/history', authMiddleware, async (req, res) => {
  const items = await getUserCalculations(req.userId, req.query.type);
  res.json({ items });
});

router.delete('/islamic/history', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserCalculations(req.userId, req.query.type);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/islamic/history/:id', authMiddleware, async (req, res) => {
  try {
    await deleteCalculation(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;