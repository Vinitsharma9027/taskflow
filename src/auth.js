const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key-2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.globalRole },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.getUserById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Check if user is project admin or global admin
function requireProjectAdmin(req, res, next) {
  const { projectId } = req.params;
  if (req.user.globalRole === 'admin') return next();
  const membership = db.getMember(projectId, req.user.id);
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Project admin access required' });
  }
  next();
}

function requireGlobalAdmin(req, res, next) {
  if (req.user.globalRole !== 'admin') {
    return res.status(403).json({ error: 'Global admin access required' });
  }
  next();
}

// Check project membership
function requireProjectMember(req, res, next) {
  const { projectId } = req.params;
  if (req.user.globalRole === 'admin') return next();
  const membership = db.getMember(projectId, req.user.id);
  if (!membership) {
    return res.status(403).json({ error: 'Project access required' });
  }
  next();
}

module.exports = { generateToken, authenticate, requireProjectAdmin, requireGlobalAdmin, requireProjectMember };
