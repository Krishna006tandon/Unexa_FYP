// Instead of mocking S3, this natively computes the local URL for the frontend.
// The uploadRoutes handles actual storage. This service bridges context.

exports.uploadToS3 = async (file, req) => {
  // Compute local full URL path
  const protocol = req.protocol;
  // Use hardcoded IP for mobile compatibility
  const host = '192.168.29.104:5000';
  
  // E.g., http://192.168.29.104:5000/uploads/unexa_123456.jpg
  return `${protocol}://${host}/uploads/${file.filename}`;
};
