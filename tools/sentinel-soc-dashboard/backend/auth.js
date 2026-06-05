const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const express = require('express');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!JWT_SECRET || !ADMIN_PASSWORD_HASH) {
  console.error('FATAL: JWT_SECRET dan ADMIN_PASSWORD_HASH harus di-set di .env');
  process.exit(1);
}

const failedAttempts = new Map();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

router.post('/login', loginLimiter, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  if (record.count >= 10) {
    const elapsed = Date.now() - record.lastAttempt;
    if (elapsed < 3600000) {
      return res.status(429).json({ error: `Account terkunci. Coba lagi dalam ${Math.ceil((3600000 - elapsed) / 60000)} menit.` });
    }
    failedAttempts.delete(ip);
  }

  const { username, password } = req.body;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const usernameMatch = username === ADMIN_USERNAME;
  const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

  if (!usernameMatch || !passwordMatch) {
    record.count++;
    record.lastAttempt = Date.now();
    failedAttempts.set(ip, record);
    console.warn(`[AUTH] Failed login from ${ip}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  failedAttempts.delete(ip);

  const token = jwt.sign(
    { username: ADMIN_USERNAME, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`[AUTH] Login successful from ${ip}`);
  res.json({ token, expiresIn: 3600, user: { username: ADMIN_USERNAME, role: 'admin' } });
});

router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

router.post('/logout', authenticateToken, (req, res) => {
  console.log(`[AUTH] Logout from ${req.ip}`);
  res.json({ message: 'Logged out' });
});

module.exports = { router, authenticateToken };
