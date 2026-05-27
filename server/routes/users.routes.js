const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.use(authenticate, requireAdmin);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/deactivate', ctrl.deactivate);
router.post('/:id/reactivate', ctrl.reactivate);

module.exports = router;
