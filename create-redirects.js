const fs = require('fs');

const pages = [
  'tb-dots',
  'health-education',
  'feedback',
  'dashboard',
  'patient-registration',
  'consultation',
  'appointment-schedule',
  'inventory',
  'immunization',
  'maternal-health',
  'infant-child-health',
  'ai-moto',
  'announcements',
  'sms-notifications',
  'admin-reports',
  'settings',
  'login',
  'signup',
  'home'
];

for (const p of pages) {
  const phpFile = `${p}.php`;
  const code = `<?php\nheader("Location: ${p}.html", true, 301);\nexit;\n`;
  fs.writeFileSync(phpFile, code, 'utf8');
}

console.log(`Created ${pages.length} PHP redirect stubs so no legacy .php URL ever returns 404!`);
