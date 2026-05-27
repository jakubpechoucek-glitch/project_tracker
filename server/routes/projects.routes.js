const router = require('express').Router();
const ctrl = require('../controllers/projects.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requirePM } = require('../middleware/role.middleware');

router.use(authenticate);
router.get('/', requirePM, ctrl.list);
router.get('/:id', requirePM, ctrl.get);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.post('/:id/archive', requireAdmin, ctrl.archive);

module.exports = router;
