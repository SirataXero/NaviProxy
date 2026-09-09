const fs = require('fs');
let code = fs.readFileSync('go-service/pkg/proxy/downloader.go', 'utf8');

code = code.replace(/func \(d \*Downloader\) Queue\(track plugins\.MusicTrack\) \(\*DownloadTask, error\) \{/,
    'func (d *Downloader) Queue(track plugins.MusicTrack) (*DownloadTask, error) {\n\tlogger.Debug("Queueing download for track: %s - %s", track.Artist, track.Title)'
);

code = code.replace(/func \(d \*Downloader\) executeDownload\(task \*DownloadTask\) \{/,
    'func (d *Downloader) executeDownload(task *DownloadTask) {\n\tlogger.Debug("Executing download task: %s", task.ID)'
);

fs.writeFileSync('go-service/pkg/proxy/downloader.go', code);
