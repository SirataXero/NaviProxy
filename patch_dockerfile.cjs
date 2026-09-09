const fs = require('fs');
let code = fs.readFileSync('Dockerfile', 'utf8');

if (!code.includes('LOG_LEVEL=')) {
    code = code.replace(/ENV PORT=8080 \\/, 'ENV PORT=8080 \\\n    LOG_LEVEL=normal \\');
}

fs.writeFileSync('Dockerfile', code);
