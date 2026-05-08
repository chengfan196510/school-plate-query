const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { initDatabase } = require('./controllers/database');

initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '服务器内部错误'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`- Frontend: http://localhost:${PORT}`);
    console.log(`- Admin: http://localhost:${PORT}/admin.html`);
});
