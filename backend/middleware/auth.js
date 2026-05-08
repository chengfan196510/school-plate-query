const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: '未授权访问'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, 'exam-system-secret-key-2025');
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: '登录已过期，请重新登录'
        });
    }
};

module.exports = authMiddleware;
