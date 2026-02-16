module.exports = {
  apps: [{
    name: 'superclaw-dashboard',
    script: 'npm',
    args: 'run start',
    cwd: '/home/mike/apps/websites/superclaw-dashboard',
    env: {
      PORT: 3077,
      NODE_ENV: 'production'
    }
  }]
};
