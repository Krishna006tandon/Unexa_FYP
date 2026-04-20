const LiveStream = require('../models/LiveStream');
const { setViewerCount } = require('../services/streamService');

module.exports = (io) => {
  // Mux module uses webhook-driven status updates (live:status emitted from webhook controller).
  // This socket file still supports live chat/reactions + viewer counts.
  // streamId -> Set(socketId)
  const streamViewers = new Map();

  const emitViewerCount = async (streamId) => {
    const viewers = streamViewers.get(streamId);
    const viewerCount = viewers ? viewers.size : 0;
    try {
      await setViewerCount(streamId, viewerCount);
    } catch (_) {}
    io.to(`live_${streamId}`).emit('live:viewers', { streamId, viewerCount });
  };

  io.on('connection', (socket) => {
    socket.liveRooms = new Set();

    socket.on('live:join', async ({ streamId, userId, username } = {}) => {
      if (!streamId) return;
      const live = await LiveStream.findById(streamId).catch(() => null);
      if (!live || !live.isLive) return;

      socket.join(`live_${streamId}`);
      socket.liveRooms.add(streamId);

      if (!streamViewers.has(streamId)) streamViewers.set(streamId, new Set());
      streamViewers.get(streamId).add(socket.id);

      io.to(`live_${streamId}`).emit('live:join', { streamId, userId, username, createdAt: new Date().toISOString() });
      io.to(`live_${streamId}`).emit('live:chat', {
        streamId,
        system: true,
        message: `${username || 'Viewer'} joined`,
        createdAt: new Date().toISOString(),
      });

      await emitViewerCount(streamId);
      socket.emit('live:joined', { streamId });
    });

    socket.on('live:leave', async ({ streamId, username } = {}) => {
      if (!streamId) return;
      socket.leave(`live_${streamId}`);
      socket.liveRooms.delete(streamId);

      const viewers = streamViewers.get(streamId);
      if (viewers) viewers.delete(socket.id);
      await emitViewerCount(streamId);

      io.to(`live_${streamId}`).emit('live:leave', { streamId, username, createdAt: new Date().toISOString() });
      io.to(`live_${streamId}`).emit('live:chat', {
        streamId,
        system: true,
        message: `${username || 'Viewer'} left`,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('live:chat', ({ streamId, userId, username, message } = {}) => {
      if (!streamId || !message) return;
      io.to(`live_${streamId}`).emit('live:chat', {
        streamId,
        userId,
        username,
        message: message.toString().slice(0, 500),
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('live:reaction', ({ streamId, userId, emoji } = {}) => {
      if (!streamId || !emoji) return;
      io.to(`live_${streamId}`).emit('live:reaction', {
        streamId,
        userId,
        emoji: emoji.toString().slice(0, 8),
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      if (!socket.liveRooms) return;
      for (const streamId of socket.liveRooms) {
        const viewers = streamViewers.get(streamId);
        if (viewers) viewers.delete(socket.id);
        await emitViewerCount(streamId);
      }
    });
  });
};
