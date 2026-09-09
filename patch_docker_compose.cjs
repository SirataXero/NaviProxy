const fs = require('fs');
let code = fs.readFileSync('docker-compose.yml', 'utf8');

if (!code.includes('LOG_LEVEL')) {
    code = code.replace(/- MIN_QUALITY=HIGH_MP3_320/, '- MIN_QUALITY=HIGH_MP3_320\n      - LOG_LEVEL=debug # Options: light, normal, debug');
}

fs.writeFileSync('docker-compose.yml', code);
