const fs = require('fs');
let code = fs.readFileSync('Dockerfile', 'utf8');

code = code.replace(/RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-s -w -extldflags '-static'" -o \/app\/naviproxy \.\/cmd\/server\/main\.go/, 
    'RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/naviproxy ./cmd/server/main.go'
);

fs.writeFileSync('Dockerfile', code);
