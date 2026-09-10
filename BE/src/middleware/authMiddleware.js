const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'plotfarm_jwt_secret_key_2026';

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục' });
  }

  try {
    req.user = jwt.verify(authorization.slice(7), JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tài nguyên này' });
  }
  return next();
};

const requireSelfOrAdmin = (req, res, next) => {
  const requestedUserId = Number(req.params.userId);
  if (req.user.role === 'quan_tri' || req.user.sub === requestedUserId) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Bạn chỉ có thể xem dữ liệu của chính mình' });
};

module.exports = { authenticate, authorize, requireSelfOrAdmin };
