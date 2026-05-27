const router = require('express').Router();
const ctrl = require('../controllers/entries.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requirePM } = require('../middleware/role.middleware');

router.use(authenticate);
router.get('/week', requirePM, ctrl.getWeek);
router.get('/pending', requireAdmin, ctrl.pending);
router.get('/dashboard/admin', requireAdmin, ctrl.adminDashboard);
router.get('/dashboard/pm', requirePM, ctrl.pmDashboard);
router.get('/', requireAdmin, ctrl.list);
router.post('/', requirePM, ctrl.create);
router.put('/:id', requirePM, ctrl.update);
router.delete('/:id', requirePM, ctrl.remove);
router.post('/submit', requirePM, ctrl.submit);
router.post('/:id/approve', requireAdmin, ctrl.approve);
router.post('/:id/reject', requireAdmin, ctrl.reject);
router.post('/:id/reopen', requireAdmin, ctrl.reopen);
router.post('/approve-week', requireAdmin, ctrl.approveWeek);
router.post('/reject-week', requireAdmin, ctrl.rejectWeek);

module.exports = router;
