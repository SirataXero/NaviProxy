const fs = require('fs');
let code = fs.readFileSync('go-service/pkg/api/handlers.go', 'utf8');

code = code.replace(/"fmt"/, '"fmt"\n\t"github.com/navidrome/naviproxy/pkg/logger"');

fs.writeFileSync('go-service/pkg/api/handlers.go', code);
