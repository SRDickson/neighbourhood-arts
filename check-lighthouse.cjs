const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lighthouse-home.json', 'utf8'));
const audits = data.audits;

console.log('SEO ISSUES:');
const seoAudits = data.categories.seo.auditRefs;
seoAudits.forEach(ref => {
  const audit = audits[ref.id];
  if (audit.score !== null && audit.score < 1) {
    console.log('-', audit.title);
  }
});

console.log('\nACCESSIBILITY ISSUES:');
const a11yAudits = data.categories.accessibility.auditRefs;
a11yAudits.forEach(ref => {
  const audit = audits[ref.id];
  if (audit.score !== null && audit.score < 1) {
    console.log('-', audit.title);
  }
});

console.log('\nTOP PERFORMANCE OPPORTUNITIES:');
const perfAudits = data.categories.performance.auditRefs;
perfAudits.filter(ref => {
  const audit = audits[ref.id];
  return audit.score !== null && audit.score < 1 && audit.details && audit.details.type === 'opportunity';
}).slice(0, 5).forEach(ref => {
  const audit = audits[ref.id];
  console.log('-', audit.title, '(savings:', audit.details.overallSavingsMs, 'ms)');
});
