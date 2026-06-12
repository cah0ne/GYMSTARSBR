import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach((file) => {
    let content = fs.readFileSync(file, 'utf8');
    // replace `src={xyz}` with `src={xyz || undefined}`
    // But be careful not to replace `src={xyz || undefined}` into `src={xyz || undefined || undefined}`
    content = content.replace(/src=\{([a-zA-Z0-9_.\?\[\]]+)\}/g, (match, p1) => {
        if (p1.includes('||')) return match; // primitive check
        return `src={${p1} || undefined}`;
    });

    // Handle string literal images `src=""` to `src={undefined}`
    content = content.replace(/src=""/g, 'src={undefined}');

    fs.writeFileSync(file, content, 'utf8');
});
