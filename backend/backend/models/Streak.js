const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema(
  {
    users: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }],
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastSharedDate: { type: Date },
    streakHistory: [{
      date: { type: Date, required: true },
      sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      mediaShare: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaShare' },
      createdAt: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true },
    streakEmoji: { type: String, default: '🔥' },
    milestoneRewards: [{
      streakCount: { type: Number, required: true },
      rewardType: { type: String, enum: ['badge', 'emoji', 'title'], required: true },
      rewardValue: { type: String, required: true },
      unlockedAt: { type: Date }
    }]
  },
  { timestamps: true }
);

// Index for efficient queries
streakSchema.index({ users: 1, isActive: 1 });
streakSchema.index({ lastSharedDate: 1 });

// Method to update streak
streakSchema.methods.updateStreak = function(userId, mediaShareId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastShared = this.lastSharedDate ? new Date(this.lastSharedDate) : null;
  if (lastShared) {
    lastShared.setHours(0, 0, 0, 0);
  }
  
  const dayDiff = lastShared ? Math.floor((today - lastShared) / (1000 * 60 * 60 * 24)) : 1;
  
  if (dayDiff === 0) {
    // Already shared today, don't update streak
    return false;
  } else if (dayDiff === 1) {
    // Consecutive day, increment streak
    this.currentStreak += 1;
  } else {
    // Streak broken, reset to 1
    this.currentStreak = 1;
  }
  
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  
  this.lastSharedDate = today;
  this.streakHistory.push({
    date: today,
    sharedBy: userId,
    mediaShare: mediaShareId
  });
  
  // Check for milestone rewards
  this.checkMilestones();
  
  return true;
};

// Method to check and unlock milestone rewards
streakSchema.methods.checkMilestones = function() {
  const milestones = [
    { count: 3, type: 'badge', value: '🌟' },
    { count: 7, type: 'emoji', value: '💎' },
    { count: 14, type: 'badge', value: '👑' },
    { count: 30, type: 'title', value: 'Streak Master' },
    { count: 50, type: 'emoji', value: '🏆' },
    { count: 100, type: 'title', value: 'Legendary' }
  ];
  
  milestones.forEach(milestone => {
    if (this.currentStreak >= milestone.count) {
      const existingReward = this.milestoneRewards.find(
        reward => reward.streakCount === milestone.count
      );
      
      if (!existingReward) {
        this.milestoneRewards.push({
          streakCount: milestone.count,
          rewardType: milestone.type,
          rewardValue: milestone.value,
          unlockedAt: new Date()
        });
      }
    }
  });
};

module.exports = mongoose.model('Streak', streakSchema);
