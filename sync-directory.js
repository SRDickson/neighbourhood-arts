import fs from 'fs';
import path from 'path';
import https from 'https';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNVmW6hjAspHGHbwFUCZEvz6bwoDva46Alf7lsqj7hgOeoX4qXREP7rRangm6nnrR7om2sFD-2P5Ei/pub?gid=1814063400&single=true&output=csv';

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
  const match = url.match(/[?&]id=([^&]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
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

function createMarkdownFile(entry) {
  const name = entry['Name']?.trim();
  if (!name) return;

  const approved = entry['Approved']?.toUpperCase() === 'Y';
  if (!approved) {
    console.log(`⏭️  Skipping ${name} (not approved)`);
    return;
  }

  const slug = createSlug(name);
  const specialties = entry['Specialties']
    ? entry['Specialties'].split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const category = categoryFromSpecialties(entry['Specialties'] || '');

  const bio = (entry['Bio'] || '').replace(/"/g, '\\"');
  const thumbnail = convertDriveUrl(entry['DirectPhotoURL']?.trim()) || '/images/placeholder-profile.jpg';
  const social = entry['Instagram / Facebook'] || '';

  const markdown = `---
name: "${name.replace(/"/g, '\\"')}"
category: "${category}"
description: "${bio}"
email: "${entry['Email Address'] || ''}"
website: "${entry['Website'] || ''}"
instagram: "${social}"
specialties: ${JSON.stringify(specialties)}
thumbnail: "${thumbnail}"
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

  console.log('📥 Fetching mastersheet...');

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
