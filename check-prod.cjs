const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lighthouse-home-prod.json', 'utf8'));
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

console.log('\nTOP PERFORMANCE DIAGNOSTICS:');
const perfAudits = data.categories.performance.auditRefs;
const opportunities = perfAudits.filter(ref => {
  const audit = audits[ref.id];
  return audit.score !== null && audit.score < 1 && audit.details && audit.details.type === 'opportunity';
}).slice(0, 5);

opportunities.forEach(ref => {
  const audit = audits[ref.id];
  console.log('-', audit.title);
});

if (opportunities.length === 0) {
  console.log('No significant opportunities found. Performance issues may be due to:');
  console.log('- Largest Contentful Paint:', audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].displayValue : 'N/A');
  console.log('- Total Blocking Time:', audits['total-blocking-time'] ? audits['total-blocking-time'].displayValue : 'N/A');
  console.log('- Cumulative Layout Shift:', audits['cumulative-layout-shift'] ? audits['cumulative-layout-shift'].displayValue : 'N/A');
}
