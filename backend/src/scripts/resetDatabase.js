const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function resetDatabase() {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`[Database] Cleared ${collection.collectionName}`);
    }
    console.log('[Database] Reset complete.');
  } catch (err) {
    console.error('[Database] Reset failed:', err);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  resetDatabase();
}
