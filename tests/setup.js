const path = require('path');
// Each test file gets a unique DB to avoid cross-suite conflicts
const testId = path.basename(process.argv.find(a => a.endsWith('.test.js')) || 'default', '.test.js');
process.env.DATABASE_URL = `./data/test-${testId}.db`;
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.BCRYPT_ROUNDS = '1';
process.env.NODE_ENV = 'test';
