const express = require('express');
const router = express.Router();
const path = require('path');
const { readDatabase } = require('../controllers/database');

router.post('/query', (req, res) => {
    try {
        const { name, idCardLast6 } = req.body;

        if (!name || !idCardLast6) {
            return res.status(400).json({
                success: false,
                message: '请输入学生姓名和身份证后6位'
            });
        }

        const idCardPattern = /^\d{6}$/;
        if (!idCardPattern.test(idCardLast6)) {
            return res.status(400).json({
                success: false,
                message: '身份证后6位必须是6位数字'
            });
        }

        const db = readDatabase();
        const students = db.students || [];

        const matched = students.find(s => 
            s.name === name && s.idCardLast6 === idCardLast6
        );

        if (!matched) {
            return res.status(404).json({
                success: false,
                message: '未找到匹配的的考生信息，请核实输入'
            });
        }

        res.json({
            success: true,
            data: {
                id: matched.id,
                name: matched.name,
                gender: matched.gender,
                ticketNumber: matched.ticketNumber,
                area: matched.area,
                school: matched.school,
                examType: matched.examType,
                examDate: matched.examDate,
                roomNumber: matched.roomNumber,
                seatNumber: matched.seatNumber,
                hasTicket: !!matched.ticketPath
            }
        });
    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({
            success: false,
            message: '查询失败，请稍后重试'
        });
    }
});

router.get('/download/:ticketId', (req, res) => {
    try {
        const { ticketId } = req.params;
        const db = readDatabase();
        const students = db.students || [];

        const student = students.find(s => s.id === ticketId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: '未找到该考生'
            });
        }

        if (!student.ticketPath) {
            return res.status(404).json({
                success: false,
                message: '准考证尚未上传，请联系学校管理员'
            });
        }

        const filePath = path.join(__dirname, '..', student.ticketPath);
        
        if (!require('fs').existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: '准考证文件不存在'
            });
        }

        res.download(filePath, `准考证_${student.name}_${student.ticketNumber}.pdf`);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: '下载失败，请稍后重试'
        });
    }
});

module.exports = router;
