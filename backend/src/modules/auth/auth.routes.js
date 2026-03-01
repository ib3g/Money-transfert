import { Router } from 'express';
import * as ctrl from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { loginLimiter, totpLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.post('/login',        loginLimiter, ctrl.login);
router.post('/verify-totp',  totpLimiter, ctrl.verifyTotp);
router.post('/refresh',      ctrl.refresh);
router.post('/logout',       authenticate, ctrl.logout);
router.get ('/me',           authenticate, ctrl.me);
router.post('/setup-totp',   authenticate, ctrl.setupTotp);
router.post('/confirm-totp', authenticate, ctrl.confirmTotp);

export default router;
