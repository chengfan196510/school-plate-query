#!/bin/bash

# 准考证查询系统启动脚本
# 用于 Mac mini M4 或其他 Mac 设备

echo "═══════════════════════════════════════════════════"
echo "  宁波诺丁汉大学附属中学准考证查询系统"
echo "═══════════════════════════════════════════════════"

# 进入项目目录
cd "$(dirname "$0")"

# 创建日志目录
mkdir -p logs

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装"
    echo "   访问 https://nodejs.org/ 下载安装"
    exit 1
fi

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "📦 正在安装 PM2 进程管理器..."
    npm install -g pm2
fi

# 安装依赖
echo "📦 检查项目依赖..."
npm install

# 启动服务
echo "🚀 启动服务..."
pm2 start ecosystem.config.js

# 保存 PM2 进程列表
echo "💾 保存 PM2 进程列表..."
pm2 save

# 设置开机自启
echo "⚙️  配置开机自启..."
pm2 startup

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ 服务启动完成！"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  常用命令："
echo "  • pm2 status        - 查看服务状态"
echo "  • pm2 logs         - 查看日志"
echo "  • pm2 restart      - 重启服务"
echo "  • pm2 stop         - 停止服务"
echo "  • pm2 monit        - 监控面板"
echo ""
echo "  访问地址："
echo "  • 前台查询: http://localhost:3000"
echo "  • 后台管理: http://localhost:3000/admin.html"
echo "  • 健康检查: http://localhost:3000/health"
echo ""
echo "═══════════════════════════════════════════════════"
