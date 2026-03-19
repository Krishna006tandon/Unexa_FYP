const Profile = require('../models/Profile');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Profile socket connected:', socket.id);

    // Join user to their personal room for profile updates
    socket.on('joinProfileRoom', (userId) => {
      socket.join(`profile_${userId}`);
      console.log(`User ${userId} joined profile room`);
    });

    // Leave profile room
    socket.on('leaveProfileRoom', (userId) => {
      socket.leave(`profile_${userId}`);
      console.log(`User ${userId} left profile room`);
    });

    // Real-time profile view tracking
    socket.on('viewProfile', async (data) => {
      try {
        const { profileId, viewerId } = data;
        
        // Update last seen for the profile owner
        await Profile.findByIdAndUpdate(
          profileId,
          { lastSeen: new Date() }
        );

        // Notify profile owner about profile view (if they're online)
        socket.to(`profile_${profileId}`).emit('profileViewed', {
          viewerId,
          viewedAt: new Date()
        });

      } catch (error) {
        console.error('Error tracking profile view:', error);
      }
    });

    // Real-time profile update notifications
    socket.on('profileUpdate', (data) => {
      const { userId, updateData } = data;
      
      // Broadcast to all connected clients except the sender
      socket.broadcast.emit('profileUpdated', {
        userId,
        updateData,
        timestamp: new Date()
      });
    });

    // Handle profile search requests
    socket.on('searchProfiles', async (data) => {
      try {
        const { query, limit = 10, page = 1 } = data;
        
        const searchRegex = new RegExp(query, 'i');
        const skip = (page - 1) * limit;

        const profiles = await Profile.find({
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
            { bio: searchRegex }
          ],
          isActive: true
        })
        .populate('user', 'name email')
        .select('-notificationSettings -privacySettings')
        .sort({ followersCount: -1 })
        .limit(limit)
        .skip(skip);

        const total = await Profile.countDocuments({
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
            { bio: searchRegex }
          ],
          isActive: true
        });

        socket.emit('searchResults', {
          profiles,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });

      } catch (error) {
        console.error('Error in profile search:', error);
        socket.emit('searchError', {
          message: 'Search failed',
          error: error.message
        });
      }
    });

    // Handle typing indicators for profile updates
    socket.on('typingProfileUpdate', (data) => {
      const { userId, isTyping } = data;
      
      socket.broadcast.emit('userTypingProfile', {
        userId,
        isTyping,
        timestamp: new Date()
      });
    });

    // Handle profile follow/unfollow (for future implementation)
    socket.on('followProfile', async (data) => {
      try {
        const { followerId, followingId } = data;
        
        // Update follower count
        await Profile.findByIdAndUpdate(
          followingId,
          { $inc: { followersCount: 1 } }
        );

        // Update following count
        await Profile.findByIdAndUpdate(
          followerId,
          { $inc: { followingCount: 1 } }
        );

        // Notify the user being followed
        socket.to(`profile_${followingId}`).emit('newFollower', {
          followerId,
          followedAt: new Date()
        });

        // Broadcast the update
        io.emit('profileFollowed', {
          followerId,
          followingId,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error in follow profile:', error);
      }
    });

    socket.on('unfollowProfile', async (data) => {
      try {
        const { followerId, followingId } = data;
        
        // Update follower count
        await Profile.findByIdAndUpdate(
          followingId,
          { $inc: { followersCount: -1 } }
        );

        // Update following count
        await Profile.findByIdAndUpdate(
          followerId,
          { $inc: { followingCount: -1 } }
        );

        // Notify the user being unfollowed
        socket.to(`profile_${followingId}`).emit('followerRemoved', {
          followerId,
          unfollowedAt: new Date()
        });

        // Broadcast the update
        io.emit('profileUnfollowed', {
          followerId,
          followingId,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error in unfollow profile:', error);
      }
    });

    // Handle profile status changes (online/offline)
    socket.on('profileStatusChange', (data) => {
      const { userId, status } = data;
      
      io.emit('profileStatusUpdated', {
        userId,
        status,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Profile socket disconnected:', socket.id);
    });
  });
};
