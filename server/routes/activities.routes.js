const router = require('express').Router();
const ctrl = require('../controllers/activities.controller');
const { requirePM, requireAdmin } = require('../middleware/auth.middleware');

router.get('/',                   requirePM,    ctrl.list);        // PMs need this for the timesheet dropdown
router.post('/',                  requireAdmin, ctrl.create);
router.put('/:id',                requireAdmin, ctrl.update);
router.post('/:id/deactivate',    requireAdmin, ctrl.deactivate);
router.post('/:id/reactivate',    requireAdmin, ctrl.reactivate);

module.exports = router;
