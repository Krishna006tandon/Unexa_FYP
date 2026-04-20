const Mux = require('@mux/mux-node');

function assertMuxEnv() {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    throw new Error('Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET');
  }
}

function createMuxClient() {
  assertMuxEnv();
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
  });
}

module.exports = {
  createMuxClient,
};

