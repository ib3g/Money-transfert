import { Router } from 'express';
import * as ctrl from './notifications.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/',                  ctrl.list);
router.get('/unread-count',      ctrl.unreadCount);
router.patch('/:id/read',        ctrl.markRead);
router.patch('/read-all',        ctrl.markAllRead);

export default router;
