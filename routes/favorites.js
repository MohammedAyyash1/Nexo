import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import {
  addFavorite, removeFavoriteByMessage, getUserFavorites,
  getUserFavoriteMessageIds, deleteAllUserFavorites,
} from '../services/favoritesService.js';

const router = express.Router();

router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const { chatId, messageId, chatTitle, content } = req.body;
    if (!chatId || !messageId || !content) return res.status(400).json({ error: 'بيانات ناقصة' });
    const favorite = await addFavorite({ userId: req.userId, chatId, messageId, chatTitle, content });
    res.json({ favorite });
  } catch (err) {
    if (err.message === 'already_favorited') return res.status(409).json({ error: 'مضاف للمفضلة أصلًا' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/favorites/by-message/:messageId', authMiddleware, async (req, res) => {
  try {
    await removeFavoriteByMessage(req.userId, req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/favorites', authMiddleware, async (req, res) => {
  res.json({ favorites: await getUserFavorites(req.userId) });
});

router.get('/favorites/ids', authMiddleware, async (req, res) => {
  res.json({ ids: await getUserFavoriteMessageIds(req.userId) });
});

router.delete('/favorites', authMiddleware, async (req, res) => {
  try {
    await deleteAllUserFavorites(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;