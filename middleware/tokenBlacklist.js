// In-memory token blacklist for logout invalidation.
// For multi-instance deployments, replace with Redis.
const blacklist = new Set();

// Prevent unbounded growth — clear if it gets huge (tokens are 7d TTL anyway)
setInterval(() => {
  if (blacklist.size > 50000) blacklist.clear();
}, 6 * 60 * 60 * 1000);

module.exports = blacklist;
