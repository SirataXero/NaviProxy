const fs = require('fs');
let code = fs.readFileSync('go-service/pkg/proxy/downloader.go', 'utf8');

if (!code.includes('"github.com/navidrome/naviproxy/pkg/logger"')) {
    code = code.replace(/"context"/, '"context"\n\t"github.com/navidrome/naviproxy/pkg/logger"');
}

code = code.replace(/func \(d \*Downloader\) QueueDownload\(ctx context\.Context, track plugins\.MusicTrack\) \(\*DownloadTask, error\) \{/,
    'func (d *Downloader) QueueDownload(ctx context.Context, track plugins.MusicTrack) (*DownloadTask, error) {\n\tlogger.Debug("Queueing download for track: %s - %s", track.Artist, track.Title)'
);

code = code.replace(/go d\.processDownload\(task\)/, 'logger.Debug("Starting background process for download task: %s", task.ID)\n\t\tgo d.processDownload(task)');

code = code.replace(/func \(d \*Downloader\) processDownload\(task \*DownloadTask\) \{/,
    'func (d *Downloader) processDownload(task *DownloadTask) {\n\tlogger.Debug("Executing download task: %s", task.ID)'
);

code = code.replace(/if err != nil \{\n\t\ttask\.Status = "failed"\n\t\ttask\.Error = err\.Error\(\)/g, (match) => {
    return 'logger.Error("Download task %s failed: %v", task.ID, err)\n\t\t' + match;
});

code = code.replace(/task\.Status = "completed"/, 'logger.Debug("Download task %s completed successfully", task.ID)\n\ttask.Status = "completed"');

fs.writeFileSync('go-service/pkg/proxy/downloader.go', code);
