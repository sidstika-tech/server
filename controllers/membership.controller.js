const User = require('../models/user.model');

const PLANS = {
  free: { name: 'Free', price: 0, features: { chatMessages: 20, reports: 3, marketResearch: 2, marketingPlans: 2 } },
  starter: { name: 'Starter', price: 29, features: { chatMessages: 200, reports: 20, marketResearch: 15, marketingPlans: 15 } },
  pro: { name: 'Pro', price: 79, features: { chatMessages: 1000, reports: 100, marketResearch: 75, marketingPlans: 75 } },
  enterprise: { name: 'Enterprise', price: 199, features: { chatMessages: -1, reports: -1, marketResearch: -1, marketingPlans: -1 } }
};

exports.getPlans = async (req, res) => {
  res.json({ success: true, plans: PLANS });
};

exports.getCurrentPlan = async (req, res) => {
  const user = await User.findById(req.user._id);
  const plan = PLANS[user.membership.plan];
  res.json({ success: true, membership: user.membership, plan, usage: user.usage });
};

exports.upgradePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const user = await User.findByIdAndUpdate(req.user._id, {
      'membership.plan': plan,
      'membership.startDate': new Date(),
      'membership.endDate': endDate,
      'membership.active': true
    }, { new: true });

    res.json({ success: true, message: `Upgraded to ${PLANS[plan].name} plan`, membership: user.membership });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
