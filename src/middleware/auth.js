function requireAdmin(req, res, next) {
  if (req.session && req.session.userId) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

module.exports = { requireAdmin };
