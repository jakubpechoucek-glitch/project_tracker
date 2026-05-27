const router = require('express').Router();
const ctrl = require('../controllers/suggestions.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requirePM } = require('../middleware/role.middleware');

router.use(authenticate);
router.get('/', requirePM, ctrl.list);
router.post('/', requirePM, ctrl.create);
router.put('/:id/status', requireAdmin, ctrl.updateStatus);

module.exports = router;
