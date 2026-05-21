const User = require('../models/user.model');

const PLANS = {
  free:       { name: 'Free',       price: 0,   features: { chatMessages: 20,   reports: 3,   marketResearch: 2,  marketingPlans: 2  } },
  starter:    { name: 'Starter',    price: 29,  features: { chatMessages: 200,  reports: 20,  marketResearch: 15, marketingPlans: 15 } },
  pro:        { name: 'Pro',        price: 79,  features: { chatMessages: 1000, reports: 100, marketResearch: 75, marketingPlans: 75 } },
  enterprise: { name: 'Enterprise', price: 199, features: { chatMessages: -1,   reports: -1,  marketResearch: -1, marketingPlans: -1 } },
};

exports.getPlans = async (req, res) => {
  res.json({ success: true, plans: PLANS });
};

exports.getCurrentPlan = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const plan = PLANS[user.membership.plan] || PLANS.free;
    res.json({ success: true, membership: user.membership, plan, usage: user.usage });
  } catch (error) {
    console.error('getCurrentPlan error:', error);
    res.status(500).json({ error: 'Failed to fetch plan info.' });
  }
};

exports.upgradePlan = async (req, res) => {
  try {
    const { plan, paymentIntentId, freeMonth, noCard } = req.body;

    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const isPaidPlan = PLANS[plan].price > 0;
    const isFreeTrial = !!(freeMonth || noCard);

    // ── FREE TRIAL (NO CARD) — allow once per user ──
    if (isPaidPlan && isFreeTrial) {
      const existing = await User.findById(req.user._id);
      if (existing?.membership?.trialUsed) {
        return res.status(403).json({
          error: 'trial_already_used',
          message: 'You have already used your free trial. Please upgrade with a payment method.',
        });
      }
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const user = await User.findByIdAndUpdate(
        req.user._id,
        {
          'membership.plan': plan,
          'membership.startDate': new Date(),
          'membership.endDate': endDate,
          'membership.active': true,
          'membership.trialUsed': true,
          'membership.isTrial': true,
        },
        { new: true }
      );
      return res.json({
        success: true,
        message: `Free trial activated. You have ${PLANS[plan].name} features for 30 days.`,
        membership: user.membership,
        trial: true,
      });
    }

    // ── PAID UPGRADE — require payment proof ──
    if (isPaidPlan && !paymentIntentId) {
      return res.status(402).json({
        error: 'payment_required',
        message: 'Payment is required to activate this plan. Please complete checkout.',
      });
    }

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'membership.plan': plan,
        'membership.startDate': new Date(),
        'membership.endDate': endDate,
        'membership.active': true,
        'membership.isTrial': false,
      },
      { new: true }
    );

    res.json({
      success: true,
      message: `Plan updated to ${PLANS[plan].name}`,
      membership: user.membership,
    });
  } catch (error) {
    console.error('upgradePlan error:', error);
    res.status(500).json({ error: 'Failed to update plan. Please try again.' });
  }
};
