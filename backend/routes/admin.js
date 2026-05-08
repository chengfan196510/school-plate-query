const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDatabase, writeDatabase, readAdminDatabase, writeAdminDatabase } = require('../controllers/database');
const authMiddleware = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../uploads/tickets');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('仅支持 PDF 文件'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const excelUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('仅支持 CSV 或 Excel 文件'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户名和密码'
            });
        }

        const adminDb = readAdminDatabase();
        const user = adminDb.users.find(u => u.username === username);

        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        user.lastLogin = new Date().toISOString();
        writeAdminDatabase(adminDb);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            'exam-system-secret-key-2025',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: '登录成功',
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试'
        });
    }
});

router.get('/stats', authMiddleware, (req, res) => {
    try {
        const db = readDatabase();
        const total = db.students ? db.students.length : 0;
        const uploaded = db.students ? db.students.filter(s => s.ticketPath).length : 0;
        const pending = total - uploaded;

        res.json({
            success: true,
            data: { total, uploaded, pending }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取统计数据失败'
        });
    }
});

router.get('/students', authMiddleware, (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', sortBy = 'createdAt', order = 'desc' } = req.query;
        
        const db = readDatabase();
        let students = db.students || [];

        if (search) {
            const searchLower = search.toLowerCase();
            students = students.filter(s => 
                s.name.toLowerCase().includes(searchLower) ||
                s.ticketNumber.toLowerCase().includes(searchLower) ||
                s.school.toLowerCase().includes(searchLower) ||
                s.roomNumber.toLowerCase().includes(searchLower)
            );
        }

        students.sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';
            if (order === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        const total = students.length;
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedStudents = students.slice(startIndex, startIndex + parseInt(limit));

        res.json({
            success: true,
            data: {
                students: paginatedStudents,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取考生列表失败'
        });
    }
});

router.post('/students', authMiddleware, (req, res) => {
    try {
        const { name, gender, ticketNumber, area, school, examType, examDate, roomNumber, seatNumber, idCardLast6 } = req.body;

        if (!name || !idCardLast6 || !ticketNumber) {
            return res.status(400).json({
                success: false,
                message: '请填写必填字段'
            });
        }

        if (!/^\d{6}$/.test(idCardLast6)) {
            return res.status(400).json({
                success: false,
                message: '身份证后6位必须是6位数字'
            });
        }

        const db = readDatabase();
        
        const exists = db.students.find(s => s.ticketNumber === ticketNumber);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: '准考证号已存在'
            });
        }

        const newStudent = {
            id: uuidv4(),
            name,
            gender: gender || '男',
            ticketNumber,
            area: area || '宁波',
            school: school || '',
            examType: examType || '校考',
            examDate: examDate || '',
            roomNumber: roomNumber || '',
            seatNumber: seatNumber || '',
            idCardLast6,
            ticketPath: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.students.push(newStudent);
        writeDatabase(db);

        res.json({
            success: true,
            message: '添加成功',
            data: newStudent
        });
    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({
            success: false,
            message: '添加考生失败'
        });
    }
});

router.put('/students/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const db = readDatabase();
        const index = db.students.findIndex(s => s.id === id);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: '未找到该考生'
            });
        }

        if (updates.idCardLast6 && !/^\d{6}$/.test(updates.idCardLast6)) {
            return res.status(400).json({
                success: false,
                message: '身份证后6位必须是6位数字'
            });
        }

        db.students[index] = {
            ...db.students[index],
            ...updates,
            id: db.students[index].id,
            updatedAt: new Date().toISOString()
        };

        writeDatabase(db);

        res.json({
            success: true,
            message: '更新成功',
            data: db.students[index]
        });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({
            success: false,
            message: '更新考生信息失败'
        });
    }
});

router.delete('/students/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const db = readDatabase();
        const student = db.students.find(s => s.id === id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: '未找到该考生'
            });
        }

        if (student.ticketPath) {
            const filePath = path.join(__dirname, '..', student.ticketPath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        db.students = db.students.filter(s => s.id !== id);
        writeDatabase(db);

        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({
            success: false,
            message: '删除考生失败'
        });
    }
});

router.post('/upload-excel', authMiddleware, excelUpload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请上传文件'
            });
        }

        const content = req.file.buffer.toString('utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            return res.status(400).json({
                success: false,
                message: '文件内容为空或格式错误'
            });
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['name', 'gender', 'ticketNumber', 'idCardLast6'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            return res.status(400).json({
                success: false,
                message: `缺少必需列: ${missingHeaders.join(', ')}`
            });
        }

        const db = readDatabase();
        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                if (!row.name || !row.ticketNumber || !row.idCardLast6) {
                    errors.push(`第${i + 1}行: 必填字段缺失`);
                    skipped++;
                    continue;
                }

                if (!/^\d{6}$/.test(row.idCardLast6)) {
                    errors.push(`第${i + 1}行: 身份证后6位格式错误`);
                    skipped++;
                    continue;
                }

                const exists = db.students.find(s => s.ticketNumber === row.ticketNumber);
                if (exists) {
                    errors.push(`第${i + 1}行: 准考证号 ${row.ticketNumber} 已存在`);
                    skipped++;
                    continue;
                }

                const newStudent = {
                    id: uuidv4(),
                    name: row.name,
                    gender: row.gender || '男',
                    ticketNumber: row.ticketNumber,
                    area: row.area || '宁波',
                    school: row.school || '',
                    examType: row.examType || '校考',
                    examDate: row.examDate || '',
                    roomNumber: row.roomNumber || '',
                    seatNumber: row.seatNumber || '',
                    idCardLast6: row.idCardLast6,
                    ticketPath: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                db.students.push(newStudent);
                imported++;
            } catch (e) {
                errors.push(`第${i + 1}行: 解析错误`);
                skipped++;
            }
        }

        writeDatabase(db);

        res.json({
            success: true,
            message: `导入完成：成功 ${imported} 条，跳过 ${skipped} 条`,
            data: { imported, skipped, errors: errors.slice(0, 10) }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: '导入失败，请检查文件格式'
        });
    }
});

router.post('/upload-tickets', authMiddleware, upload.array('files', 100), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请上传文件'
            });
        }

        const db = readDatabase();
        let matched = 0;
        let unmatched = [];
        const results = [];

        for (const file of req.files) {
            const filename = path.basename(file.originalname, path.extname(file.originalname));
            const parts = filename.split('_');

            if (parts.length < 2) {
                unmatched.push({
                    originalName: file.originalname,
                    reason: '文件名格式不正确，应为：考场号_座位号'
                });
                continue;
            }

            const roomNumber = parts[0];
            const seatNumber = parts[parts.length - 1];
            const ticketPath = `/uploads/tickets/${file.filename}`;

            const student = db.students.find(s => 
                s.roomNumber === roomNumber && s.seatNumber === seatNumber
            );

            if (student) {
                if (student.ticketPath) {
                    const oldPath = path.join(__dirname, '..', student.ticketPath);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }

                student.ticketPath = ticketPath;
                student.updatedAt = new Date().toISOString();
                matched++;
                results.push({
                    file: file.originalname,
                    student: student.name,
                    ticketNumber: student.ticketNumber,
                    status: 'success'
                });
            } else {
                fs.unlinkSync(file.path);
                unmatched.push({
                    file: file.originalname,
                    roomNumber,
                    seatNumber,
                    reason: '未找到匹配的考生'
                });
            }
        }

        writeDatabase(db);

        res.json({
            success: true,
            message: `匹配完成：成功 ${matched} 个，未匹配 ${unmatched.length} 个`,
            data: { matched, unmatched, results }
        });
    } catch (error) {
        console.error('Upload tickets error:', error);
        res.status(500).json({
            success: false,
            message: '上传失败'
        });
    }
});

router.get('/check-ticket/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const db = readDatabase();
        const student = db.students.find(s => s.id === id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: '未找到该考生'
            });
        }

        res.json({
            success: true,
            data: {
                hasTicket: !!student.ticketPath,
                ticketPath: student.ticketPath
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '检查失败'
        });
    }
});

module.exports = router;
