module.exports = {
  apps: [{
    name: 'exam-system',
    script: 'backend/server.js',
    interpreter: 'node',
    cwd: '/workspace',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/workspace/logs/error.log',
    out_file: '/workspace/logs/out.log',
    time: true,
    kill_timeout: 5000,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
