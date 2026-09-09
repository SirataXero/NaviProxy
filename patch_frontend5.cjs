const fs = require('fs');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    for (let [search, replace] of replacements) {
        content = content.replace(new RegExp(search, 'g'), replace);
    }
    fs.writeFileSync(filepath, content);
}

replaceInFile('src/components/AudioPlayerBar.tsx', [
    ['currentTrack\\.inLocalLibrary', '(currentTrack.inLocalLibrary || currentTrack.in_local_library)']
]);

console.log("Patched 5!");
