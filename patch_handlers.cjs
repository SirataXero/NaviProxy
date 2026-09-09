const fs = require('fs');
let code = fs.readFileSync('go-service/pkg/api/handlers.go', 'utf8');

if (!code.includes('"github.com/navidrome/naviproxy/pkg/logger"')) {
    code = code.replace(/"encoding\/json"/, '"encoding/json"\n\t"github.com/navidrome/naviproxy/pkg/logger"');
}

code = code.replace(/func \(h \*APIHandler\) HandleSearch\(w http\.ResponseWriter, r \*http\.Request\) \{/, 
    'func (h *APIHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {\n\tlogger.Debug("Received API search request: %s", r.URL.String())'
);

code = code.replace(/func \(h \*APIHandler\) HandleStream\(w http\.ResponseWriter, r \*http\.Request\) \{/, 
    'func (h *APIHandler) HandleStream(w http.ResponseWriter, r *http.Request) {\n\tlogger.Debug("Received API stream request: %s", r.URL.String())'
);

code = code.replace(/func \(h \*APIHandler\) HandleQueueDownload\(w http\.ResponseWriter, r \*http\.Request\) \{/, 
    'func (h *APIHandler) HandleQueueDownload(w http.ResponseWriter, r *http.Request) {\n\tlogger.Debug("Received API download request: %s", r.URL.String())'
);

fs.writeFileSync('go-service/pkg/api/handlers.go', code);
