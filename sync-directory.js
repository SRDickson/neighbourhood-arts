import fs from 'fs';
import path from 'path';
import https from 'https';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1esSgeY0bj-BzKG3BbDQV9YnQXz3Yrb3fsQxfHXqj4ek/export?format=csv&gid=1814063400';

const CONTENT_DIR = './src/content/directory';

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function splitCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.replace(/^"|"$/g, '').trim());
  return values;
}

function parseCSV(csv) {
  const lines = csv.split('\n');
  const headers = splitCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

function convertDriveUrl(url) {
  if (!url) return '';
  const idMatch = url.match(/[?&]id=([^&]+)/) || url.match(/\/file\/d\/([^/]+)/);
  if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
  return url;
}

function categoryFromSpecialties(specialties) {
  const s = specialties.toLowerCase();
  if (s.includes('venue')) return 'venues';
  if (s.includes('music') || s.includes('musician') || s.includes('singer') || s.includes('band')) return 'musicians';
  if (s.includes('perform') || s.includes('theatre') || s.includes('theater') || s.includes('dance')) return 'performers';
  if (s.includes('craft') || s.includes('workshop') || s.includes('maker') || s.includes('textile')) return 'craft-and-workshops';
  return 'artists';
}

function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitList(value) {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function createMarkdownFile(entry) {
  const name = entry['Name']?.trim();
  if (!name) return;

  const slug = createSlug(name);
  const specialties = splitList(entry['Specialties']);
  const discipline = splitList(entry['Discipline']);
  const category = categoryFromSpecialties(entry['Specialties'] || '');

  const bio = (entry['Bio'] || '').replace(/"/g, '\\"');
  const thumbnail = convertDriveUrl(entry['Hero Final']?.trim()) || '/images/placeholder-profile.jpg';
  const gallery = ['G1 final', 'G2 final', 'G3 final']
    .map(col => convertDriveUrl(entry[col]?.trim()))
    .filter(Boolean);
  const social = entry['Instagram / Facebook'] || '';

  const markdown = `---
name: "${name.replace(/"/g, '\\"')}"
category: "${category}"
description: "${bio}"
email: "${entry['Email Address'] || ''}"
website: "${entry['Website'] || ''}"
instagram: "${social}"
specialties: ${JSON.stringify(specialties)}
discipline: ${JSON.stringify(discipline)}
thumbnail: "${thumbnail}"
gallery: ${JSON.stringify(gallery)}
altText: "${name.replace(/"/g, '\\"')}"
verified: true
draft: false
---

${entry['Bio'] || ''}
`;

  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  fs.writeFileSync(filePath, markdown);
  console.log(`✅ Created: ${name} → ${slug}.md`);
}

async function syncDirectory() {
  console.log('🔄 Starting directory sync...\n');

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    console.log('📁 Created content directory\n');
  }

  const files = fs.readdirSync(CONTENT_DIR);
  files.forEach(file => {
    if (file.endsWith('.md')) fs.unlinkSync(path.join(CONTENT_DIR, file));
  });
  console.log('🗑️  Cleared old directory files\n');

  console.log('📥 Fetching MasterFeed...');

  try {
    const csvData = await fetchCSV(CSV_URL);
    const entries = parseCSV(csvData);
    console.log(`   Found ${entries.length} entries\n`);
    entries.forEach(entry => createMarkdownFile(entry));
  } catch (error) {
    console.error('❌ Error fetching sheet:', error.message);
  }

  console.log('\n✨ Directory sync complete!\n');
}

syncDirectory().catch(console.error);
