#!/usr/bin/env node
// Extracts base64 images from data.js, saves them as files in images/,
// and rewrites data.js to reference the file paths instead.

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data.js');
const imgDir   = path.join(__dirname, 'images');

if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);

let src = fs.readFileSync(dataPath, 'utf8');

// Match:  <number>: "data:image/<ext>;base64,<data>"
// The base64 strings are very long single-line values.
const re = /(\d+):\s*"(data:image\/(\w+);base64,([^"]+))"/g;
// Collect all matches first (before modifying src)
const matches = [];
let match;
while ((match = re.exec(src)) !== null) {
  matches.push({ full: match[0], id: match[1], ext: match[3], b64: match[4] });
}

let count = 0;
for (const { full, id, ext, b64 } of matches) {
  const filename = `room-${id}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const filepath = path.join(imgDir, filename);
  fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));
  const sizeKB = Math.round(fs.statSync(filepath).size / 1024);
  console.log(`  Saved images/${filename}  (${sizeKB} KB)`);
  // Replace only the first occurrence of this exact match
  src = src.replace(full, `${id}: "images/${filename}"`);
  count++;
}

if (count === 0) {
  console.log('No base64 images found — nothing to do.');
  process.exit(0);
}

fs.writeFileSync(dataPath, src, 'utf8');
console.log(`\nDone. Extracted ${count} image(s). data.js rewritten.`);
