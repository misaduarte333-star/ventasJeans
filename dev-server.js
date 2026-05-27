const { spawn } = require('child_process');
const os = require('os');

const nets = os.networkInterfaces();
const results = [];

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      results.push(net.address);
    }
  }
}

console.log('\n\x1b[32m✔ Servidor de desarrollo iniciando...\x1b[0m\n');
console.log('\x1b[1mPara ver en otros dispositivos en tu red Wi-Fi, abre:\x1b[0m');
results.forEach(ip => {
  console.log(`\x1b[36m  ➜  http://${ip}:3000\x1b[0m`);
});
console.log('');

const child = spawn(/^win/.test(process.platform) ? 'npx.cmd' : 'npx', ['next', 'dev', '--hostname', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});
