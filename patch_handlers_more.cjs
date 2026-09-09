const fs = require('fs');
let code = fs.readFileSync('go-service/pkg/api/handlers.go', 'utf8');

if (!code.includes('logger.Debug("Updating proxy configuration")')) {
    code = code.replace(/func \(h \*APIHandler\) HandleUpdateConfig\(w http\.ResponseWriter, r \*http\.Request\) \{/,
        'func (h *APIHandler) HandleUpdateConfig(w http.ResponseWriter, r *http.Request) {\n\tlogger.Debug("Updating proxy configuration")'
    );
}

if (!code.includes('logger.Debug("Serving config to client")')) {
    code = code.replace(/func \(h \*APIHandler\) HandleGetConfig\(w http\.ResponseWriter, r \*http\.Request\) \{/,
        'func (h *APIHandler) HandleGetConfig(w http.ResponseWriter, r *http.Request) {\n\tlogger.Debug("Serving config to client")'
    );
}

if (!code.includes('logger.Debug("Retrieving streaming proxy chunks for: %s", id)')) {
    code = code.replace(/func \(h \*APIHandler\) HandleStream\(w http\.ResponseWriter, r \*http\.Request\) \{/,
        'func (h *APIHandler) HandleStream(w http.ResponseWriter, r *http.Request) {\n\tlogger.Debug("Retrieving streaming proxy chunks for: %s", r.URL.Path)'
    );
}

fs.writeFileSync('go-service/pkg/api/handlers.go', code);
