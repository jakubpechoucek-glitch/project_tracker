const router = require('express').Router();
const ctrl = require('../controllers/assignments.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requirePM } = require('../middleware/role.middleware');

router.use(authenticate);
router.get('/my-projects', requirePM, ctrl.myProjects);
router.get('/', requireAdmin, ctrl.list);
router.post('/', requireAdmin, ctrl.create);
router.post('/:id/end', requireAdmin, ctrl.endAssignment);

module.exports = router;
