const fs = require('fs');
let code = fs.readFileSync('go-service/cmd/server/main.go', 'utf8');

code = code.replace(/"log"/, '"github.com/navidrome/naviproxy/pkg/logger"\n\t"log"');

code = code.replace(/log\.Println\("\[NaviProxy\] Initializing Navidrome Music Proxy Service..."\)/, 'logger.Init()\n\tlogger.Info("Initializing Navidrome Music Proxy Service...")');

code = code.replace(/log\.Fatalf/g, 'logger.Fatal');
code = code.replace(/log\.Printf/g, 'logger.Info');
code = code.replace(/log\.Println\("\[NaviProxy\] 8 source plugins loaded/g, 'logger.Info("8 source plugins loaded');
code = code.replace(/log\.Println\("\[NaviProxy\] Shutting down/g, 'logger.Info("Shutting down');
code = code.replace(/log\.Println\("\[NaviProxy\] Server exited/g, 'logger.Info("Server exited');

fs.writeFileSync('go-service/cmd/server/main.go', code);
