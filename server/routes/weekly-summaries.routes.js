const router = require('express').Router();
const ctrl = require('../controllers/weekly-summaries.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.get);
router.put('/', ctrl.upsert);

module.exports = router;
