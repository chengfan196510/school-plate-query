const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { initDatabase } = require('./controllers/database');

const app = express();
const PORT = process.env.PORT || 3000;

const logStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logStream.write(`${new Date().toISOString()} | ${req.method} ${req.url} | ${res.statusCode} | ${duration}ms\n`);
    });
    next();
});

app.use(compression());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: '1h',
    etag: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true
}));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    logStream.write(`[ERROR] ${new Date().toISOString()} | Uncaught Exception: ${err.stack}\n`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logStream.write(`[ERROR] ${new Date().toISOString()} | Unhandled Rejection: ${reason}\n`);
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    logStream.write(`[ERROR] ${new Date().toISOString()} | ${req.method} ${req.url} | ${err.message}\n`);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '服务器内部错误'
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('  宁波诺丁汉大学附属中学准考证查询系统');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  服务地址: http://0.0.0.0:${PORT}`);
    console.log(`  前台页面: http://localhost:${PORT}`);
    console.log(`  后台管理: http://localhost:${PORT}/admin.html`);
    console.log(`  健康检查: http://localhost:${PORT}/health`);
    console.log(`  启动时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('═══════════════════════════════════════════════════');
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在优雅关闭...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在优雅关闭...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
