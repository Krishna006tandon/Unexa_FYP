const express = require('express');
const router = express.Router();
const Streak = require('../models/Streak');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');

// GET /api/streaks/my-streaks - Get current user's streaks
router.get('/my-streaks', protect, async (req, res) => {
  try {
    const streaks = await Streak.find({ 
      users: req.user._id,
      isActive: true 
    })
    .populate('users', 'username profilePhoto')
    .populate('streakHistory.sharedBy', 'username profilePhoto')
    .populate('streakHistory.mediaShare')
    .sort({ lastSharedDate: -1 });
    
    res.json({ streaks });
    
  } catch (error) {
    console.error('Error fetching streaks:', error);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

// GET /api/streaks/:userId - Get streak with specific user
router.get('/:userId', protect, async (req, res) => {
  try {
    const users = [req.user._id, req.params.userId].sort();
    
    const streak = await Streak.findOne({ 
      users: { $all: users, $size: 2 },
      isActive: true 
    })
    .populate('users', 'username profilePhoto')
    .populate('streakHistory.sharedBy', 'username profilePhoto')
    .populate('streakHistory.mediaShare');
    
    if (!streak) {
      return res.json({ 
        streak: null, 
        message: 'No streak found with this user' 
      });
    }
    
    res.json({ streak });
    
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// GET /api/streaks/leaderboard - Get streak leaderboard
router.get('/leaderboard', protect, async (req, res) => {
  try {
    // Get all active streaks and find the longest ones
    const streaks = await Streak.find({ 
      isActive: true,
      currentStreak: { $gte: 1 }
    })
    .populate('users', 'username profilePhoto')
    .sort({ currentStreak: -1, longestStreak: -1 })
    .limit(50);
    
    // Group by user and find their best streak
    const userStreaks = {};
    
    streaks.forEach(streak => {
      streak.users.forEach(user => {
        if (!userStreaks[user._id]) {
          userStreaks[user._id] = {
            user,
            bestCurrentStreak: 0,
            bestLongestStreak: 0,
            streakCount: 0
          };
        }
        
        userStreaks[user._id].bestCurrentStreak = Math.max(
          userStreaks[user._id].bestCurrentStreak, 
          streak.currentStreak || 0
        );
        userStreaks[user._id].bestLongestStreak = Math.max(
          userStreaks[user._id].bestLongestStreak, 
          streak.longestStreak || 0
        );
        userStreaks[user._id].streakCount += 1;
      });
    });
    
    // Convert to array and sort
    const leaderboard = Object.values(userStreaks)
      .sort((a, b) => b.bestCurrentStreak - a.bestCurrentStreak)
      .slice(0, 20); // Top 20
    
    res.json({ leaderboard });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/streaks/:userId/reset - Reset streak with user
router.post('/:userId/reset', protect, async (req, res) => {
  try {
    const users = [req.user._id, req.params.userId].sort();
    
    const streak = await Streak.findOne({ 
      users: { $all: users, $size: 2 },
      isActive: true 
    });
    
    if (!streak) {
      return res.status(404).json({ error: 'No active streak found' });
    }
    
    streak.isActive = false;
    await streak.save();
    
    res.json({ message: 'Streak reset successfully' });
    
  } catch (error) {
    console.error('Error resetting streak:', error);
    res.status(500).json({ error: 'Failed to reset streak' });
  }
});

// GET /api/streaks/stats - Get user's streak statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const streaks = await Streak.find({ 
      users: req.user._id,
      isActive: true 
    });
    
    const totalStreaks = streaks.length;
    const activeStreaks = streaks.filter(s => s.currentStreak > 0).length;
    const longestStreak = streaks.length > 0 ? Math.max(...streaks.map(s => s.longestStreak || 0), 0) : 0;
    const avgStreakLength = activeStreaks > 0 
      ? Math.round(streaks.reduce((sum, s) => sum + (s.currentStreak || 0), 0) / activeStreaks)
      : 0;
    
    // Get milestone rewards
    const allRewards = streaks.flatMap(s => s.milestoneRewards || []);
    const uniqueRewards = [...new Set(allRewards.map(r => r.rewardValue))];
    
    res.json({
      stats: {
        totalStreaks,
        activeStreaks,
        longestStreak,
        avgStreakLength,
        totalRewards: uniqueRewards.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching streak stats:', error);
    res.status(500).json({ error: 'Failed to fetch streak statistics' });
  }
});

module.exports = router;
