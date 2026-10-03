const mongoose = require('mongoose');

let isConnectedOnce = false;

async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  isConnectedOnce = true;
  return mongoose.connection;
}

/**
 * Returns a plain-object health snapshot of the MongoDB connection.
 * readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
function getDbHealth() {
  const state = mongoose.connection.readyState;
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    connected: state === 1,
    state: stateNames[state] || 'unknown',
    everConnected: isConnectedOnce,
  };
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB, getDbHealth, mongoose };
