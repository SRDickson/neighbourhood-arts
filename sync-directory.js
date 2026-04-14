import fs from 'fs';
import path from 'path';
import https from 'https';

const SHEET_ID = '1GCxIxZA7vUlk4WgdFAM1NEJhLjUKly6cdHJoapRzhxw';

const SHEETS = {
  'Visual Artists': 'artists',
  'Musician': 'musicians',
  'Performer': 'performers',
  'Crafts': 'craft-and-workshops',
  'Venue': 'venues'
};

const CONTENT_DIR = './src/content/directory';

// Function to fetch CSV data from Google Sheets
function fetchSheetData(sheetName) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Function to parse CSV
function parseCSV(csv) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = [];
    let current = '';
    let inQuotes = false;

    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
    });

    rows.push(row);
  }

  return rows;
}

// Function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Function to create markdown file
function createMarkdownFile(entry, category) {
  const slug = createSlug(entry.Name);
  const verified = entry.Verified?.toLowerCase() === 'yes';

  // Skip if not verified
  if (!verified) {
    console.log(`⏭️  Skipping ${entry.Name} (not verified)`);
    return;
  }

  const markdown = `---
name: "${entry.Name}"
category: "${category}"
description: "${entry.Bio || ''}"
email: "${entry.Email || ''}"
website: "${entry.Website || ''}"
instagram: "${entry.Instagram || ''}"
facebook: "${entry.Facebook || ''}"
specialties: ${entry.Specialties ? `["${entry.Specialties.split(',').map(s => s.trim()).join('", "')}"]` : '[]'}
thumbnail: "${entry.Photo_URL || '/images/placeholder-profile.jpg'}"
altText: "${entry.Alt_Text || entry.Name}"
verified: ${verified}
draft: false
---

${entry.Bio || ''}
`;

  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  fs.writeFileSync(filePath, markdown);
  console.log(`✅ Created: ${entry.Name} → ${slug}.md`);
}

// Main sync function
async function syncDirectory() {
  console.log('🔄 Starting directory sync...\n');

  // Create directory if it doesn't exist
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    console.log('📁 Created content directory\n');
  }

  // Clear existing directory files
  const files = fs.readdirSync(CONTENT_DIR);
  files.forEach(file => {
    if (file.endsWith('.md')) {
      fs.unlinkSync(path.join(CONTENT_DIR, file));
    }
  });
  console.log('🗑️  Cleared old directory files\n');

  // Fetch and process each sheet
  for (const [sheetName, category] of Object.entries(SHEETS)) {
    console.log(`📥 Fetching ${sheetName}...`);

    try {
      const csvData = await fetchSheetData(sheetName);
      const entries = parseCSV(csvData);

      console.log(`   Found ${entries.length} entries`);

      entries.forEach(entry => {
        if (entry.Name && entry.Name.trim()) {
          createMarkdownFile(entry, category);
        }
      });

      console.log('');
    } catch (error) {
      console.error(`❌ Error fetching ${sheetName}:`, error.message);
    }
  }

  console.log('✨ Directory sync complete!\n');
}

// Run sync
syncDirectory().catch(console.error);
