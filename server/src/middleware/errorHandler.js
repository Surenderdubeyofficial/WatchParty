export function notFound(req, res, next) {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API route not found.' });
  next();
}

export function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || error.status || 500;
  res.status(status).json({
    message: error.message || 'Unexpected server error.',
    details: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
}
