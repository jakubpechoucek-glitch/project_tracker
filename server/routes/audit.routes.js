const router = require('express').Router();
const ctrl = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/', authenticate, requireAdmin, ctrl.list);

module.exports = router;
