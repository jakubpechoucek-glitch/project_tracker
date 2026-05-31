const router = require('express').Router();
const ctrl = require('../controllers/activities.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requirePM } = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/',                   requirePM,    ctrl.list);        // PMs need this for the timesheet dropdown
router.post('/',                  requireAdmin, ctrl.create);
router.put('/:id',                requireAdmin, ctrl.update);
router.post('/:id/deactivate',    requireAdmin, ctrl.deactivate);
router.post('/:id/reactivate',    requireAdmin, ctrl.reactivate);

module.exports = router;
