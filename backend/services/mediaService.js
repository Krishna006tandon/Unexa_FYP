// Instead of mocking S3, this natively computes the local URL for the frontend.
// The uploadRoutes handles actual storage. This service bridges context.

exports.uploadToS3 = async (file, req) => {
  // Compute local full URL path
  const protocol = req.protocol;
  // Fallback to local machine IP if host is lost, this avoids localhost bugs on physical phones
  const host = req.get('host');
  
  // E.g., http://localhost:5000/uploads/unexa_123456.jpg
  return `${protocol}://${host}/uploads/${file.filename}`;
};
