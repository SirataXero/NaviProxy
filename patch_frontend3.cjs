const fs = require('fs');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    for (let [search, replace] of replacements) {
        content = content.replace(new RegExp(search, 'g'), replace);
    }
    fs.writeFileSync(filepath, content);
}

replaceInFile('src/components/MusicSearch.tsx', [
    ['src\\.tookMs', '(src.tookMs || src.took_ms || 0)']
]);

console.log("Patched 3!");
