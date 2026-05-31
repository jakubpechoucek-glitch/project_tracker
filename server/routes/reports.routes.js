const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.use(authenticate, requireAdmin);
router.get('/monthly', ctrl.monthly);
router.get('/budget', ctrl.budget);
router.get('/workload', ctrl.workload);
router.get('/timeline', ctrl.timeline);
router.get('/approval', ctrl.approval);
router.get('/activity', ctrl.activity);

module.exports = router;
