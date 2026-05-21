const User = require('../models/user.model');

/* ──────────────────────────────────────────────────────────────────
   USAGE LIMITS — by membership plan
   ADMINS BYPASS EVERY LIMIT. Set isAdmin=true on a user to unlock
   unlimited access for testing.
──────────────────────────────────────────────────────────────────── */
const PLAN_LIMITS = {
  free:       { chatMessages: 20,   reports: 3,   marketResearch: 2,  marketingPlans: 2  },
  starter:    { chatMessages: 200,  reports: 20,  marketResearch: 15, marketingPlans: 15 },
  pro:        { chatMessages: 1000, reports: 100, marketResearch: 75, marketingPlans: 75 },
  enterprise: { chatMessages: -1,   reports: -1,  marketResearch: -1, marketingPlans: -1 },
};

function limitError(res, limitType) {
  return res.status(403).json({
    error: 'limit_reached',
    limitType,
    message: 'You have reached your plan limit. Please upgrade to continue.',
  });
}

async function freshUser(req) {
  return User.findById(req.user._id);
}

// One generic checker — bypasses if isAdmin, otherwise enforces the per-plan limit
function makeChecker(limitKey, usageKey, errType) {
  return async (req, res, next) => {
    try {
      const user = await freshUser(req);
      // ── ADMIN BYPASS ──
      if (user && user.isAdmin) return next();
      const lim = PLAN_LIMITS[user.membership.plan] || PLAN_LIMITS.free;
      if (lim[limitKey] !== -1 && user.usage[usageKey] >= lim[limitKey]) {
        return limitError(res, errType);
      }
      next();
    } catch { next(); }
  };
}

exports.checkChat            = makeChecker('chatMessages',   'chatMessages',     'chat');
exports.checkReport          = makeChecker('reports',        'reportsGenerated', 'reports');
exports.checkMarketResearch  = makeChecker('marketResearch', 'marketResearch',   'market_research');
exports.checkMarketing       = makeChecker('marketingPlans', 'marketingPlans',   'marketing');
