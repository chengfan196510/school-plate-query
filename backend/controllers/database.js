const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../database/data.json');
const ADMIN_PATH = path.join(__dirname, '../database/admin.json');

function initDatabase() {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
        const initialData = {
            students: [
                {
                    id: uuidv4(),
                    name: "李明轩",
                    gender: "男",
                    ticketNumber: "20250315001",
                    area: "宁波",
                    school: "宁波中学",
                    examType: "校考",
                    examDate: "2025-03-15",
                    roomNumber: "A101",
                    seatNumber: "01",
                    idCardLast6: "123456",
                    ticketPath: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: uuidv4(),
                    name: "王雨涵",
                    gender: "女",
                    ticketNumber: "20250315002",
                    area: "宁波",
                    school: "鄞州实验中学",
                    examType: "校考",
                    examDate: "2025-03-15",
                    roomNumber: "A101",
                    seatNumber: "02",
                    idCardLast6: "234567",
                    ticketPath: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: uuidv4(),
                    name: "张子墨",
                    gender: "男",
                    ticketNumber: "20250315003",
                    area: "宁波",
                    school: "镇海中学",
                    examType: "校考",
                    examDate: "2025-03-15",
                    roomNumber: "A102",
                    seatNumber: "01",
                    idCardLast6: "345678",
                    ticketPath: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: uuidv4(),
                    name: "陈思琪",
                    gender: "女",
                    ticketNumber: "20250315004",
                    area: "宁波",
                    school: "宁波中学",
                    examType: "校考",
                    examDate: "2025-03-15",
                    roomNumber: "A102",
                    seatNumber: "02",
                    idCardLast6: "456789",
                    ticketPath: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: uuidv4(),
                    name: "刘浩然",
                    gender: "男",
                    ticketNumber: "20250315005",
                    area: "宁波",
                    school: "北仑中学",
                    examType: "校考",
                    examDate: "2025-03-15",
                    roomNumber: "B201",
                    seatNumber: "01",
                    idCardLast6: "567890",
                    ticketPath: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ],
            updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    }

    if (!fs.existsSync(ADMIN_PATH)) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const adminData = {
            users: [
                {
                    id: uuidv4(),
                    username: 'admin',
                    passwordHash: hashedPassword,
                    role: 'admin',
                    lastLogin: null,
                    createdAt: new Date().toISOString()
                }
            ]
        };
        fs.writeFileSync(ADMIN_PATH, JSON.stringify(adminData, null, 2), 'utf8');
    }
}

function readDatabase() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { students: [] };
    }
}

function writeDatabase(data) {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readAdminDatabase() {
    try {
        const data = fs.readFileSync(ADMIN_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { users: [] };
    }
}

function writeAdminDatabase(data) {
    fs.writeFileSync(ADMIN_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    initDatabase,
    readDatabase,
    writeDatabase,
    readAdminDatabase,
    writeAdminDatabase
};
