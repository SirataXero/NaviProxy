const fs = require('fs');
let code = fs.readFileSync('go-service/pkg/proxy/service.go', 'utf8');

if (!code.includes('"github.com/navidrome/naviproxy/pkg/logger"')) {
    code = code.replace(/"context"/, '"context"\n\t"github.com/navidrome/naviproxy/pkg/logger"');
}

code = code.replace(/func \(s \*Service\) Search\(ctx context\.Context, req plugins\.SearchRequest\) \(\*UnifiedSearchResponse, error\) \{/,
    'func (s *Service) Search(ctx context.Context, req plugins.SearchRequest) (*UnifiedSearchResponse, error) {\n\tlogger.Debug("Initiating unified search for query: \'%s\' (type: %s, minQuality: %s)", req.Query, req.Type, req.MinQuality)'
);

code = code.replace(/return \&UnifiedSearchResponse\{[\s\S]*?\}, nil/, (match) => {
    return 'logger.Debug("Search complete for query \'%s\'. Found %d results across %d sources.", req.Query, totalResults, len(resp.SourcesQueried))\n\t' + match;
});

code = code.replace(/cacheKey := fmt\.Sprintf\("search:%s:%s:%d", req\.Query, req\.Type, req\.MinQuality\)/, (match) => {
    return match + '\n\tlogger.Debug("Checking cache for key: %s", cacheKey)';
});

code = code.replace(/func \(s \*Service\) GetStream\(ctx context\.Context, sourceID string, trackID string\) \(\*plugins\.StreamInfo, error\) \{/,
    'func (s *Service) GetStream(ctx context.Context, sourceID string, trackID string) (*plugins.StreamInfo, error) {\n\tlogger.Debug("Initiating stream request for source: %s, track: %s", sourceID, trackID)'
);

fs.writeFileSync('go-service/pkg/proxy/service.go', code);
