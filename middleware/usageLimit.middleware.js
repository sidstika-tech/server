const User = require('../models/user.model');

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

exports.checkChat = async (req, res, next) => {
  try {
    const user = await freshUser(req);
    const lim = PLAN_LIMITS[user.membership.plan] || PLAN_LIMITS.free;
    if (lim.chatMessages !== -1 && user.usage.chatMessages >= lim.chatMessages) {
      return limitError(res, 'chat');
    }
    next();
  } catch { next(); }
};

exports.checkReport = async (req, res, next) => {
  try {
    const user = await freshUser(req);
    const lim = PLAN_LIMITS[user.membership.plan] || PLAN_LIMITS.free;
    if (lim.reports !== -1 && user.usage.reportsGenerated >= lim.reports) {
      return limitError(res, 'reports');
    }
    next();
  } catch { next(); }
};

exports.checkMarketResearch = async (req, res, next) => {
  try {
    const user = await freshUser(req);
    const lim = PLAN_LIMITS[user.membership.plan] || PLAN_LIMITS.free;
    if (lim.marketResearch !== -1 && user.usage.marketResearch >= lim.marketResearch) {
      return limitError(res, 'market_research');
    }
    next();
  } catch { next(); }
};

exports.checkMarketing = async (req, res, next) => {
  try {
    const user = await freshUser(req);
    const lim = PLAN_LIMITS[user.membership.plan] || PLAN_LIMITS.free;
    if (lim.marketingPlans !== -1 && user.usage.marketingPlans >= lim.marketingPlans) {
      return limitError(res, 'marketing');
    }
    next();
  } catch { next(); }
};
