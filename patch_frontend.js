const fs = require('fs');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    for (let [search, replace] of replacements) {
        content = content.replace(new RegExp(search, 'g'), replace);
    }
    fs.writeFileSync(filepath, content);
}

replaceInFile('src/components/MusicSearch.tsx', [
    ['searchResponse.sourcesQueried', '(searchResponse.sourcesQueried || searchResponse.sources_queried)'],
    ['searchResponse.totalResults', '(searchResponse.totalResults || searchResponse.total_found)'],
    ['searchResponse.tookMs', '(searchResponse.tookMs || searchResponse.took_ms)'],
    ['searchResponse.filteredOutCount', '(searchResponse.filteredOutCount || searchResponse.filtered_out_count)'],
    ['src.source', '(src.source || src.Source)'],
    ['src.count', '(src.count || src.Count)'],
    ['src.tookMs', '(src.tookMs || src.TookMs)'],
    ['track.coverArtUrl', '(track.coverArtUrl || track.cover_art_url)'],
    ['track.sourceId', '(track.sourceId || track.source_id)'],
    ['track.inLocalLibrary', '(track.inLocalLibrary || track.in_local_library)'],
    ['track.fileSizeEstimateBytes', '(track.fileSizeEstimateBytes || track.file_size_bytes)']
]);

replaceInFile('src/components/AudioPlayerBar.tsx', [
    ['currentTrack.coverArtUrl', '(currentTrack.coverArtUrl || currentTrack.cover_art_url)'],
    ['currentTrack.sourceId', '(currentTrack.sourceId || currentTrack.source_id)'],
    ['currentTrack.streamUrl', '(currentTrack.streamUrl || currentTrack.stream_url)']
]);

console.log("Patched!");
