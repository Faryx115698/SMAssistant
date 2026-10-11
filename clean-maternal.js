const fs = require('fs');

let content = fs.readFileSync('maternal-health.html', 'utf8');

// Replace all <? ... ?> tags with clean static defaults
content = content.replace(/<\?php[\s\S]*?\?>/g, '');
content = content.replace(/<\?=[\s\S]*?\?>/g, (match) => {
  if (match.includes('full_name') || match.includes('username')) return 'ADMINISTRATOR';
  if (match.includes('$search')) return '';
  if (match.includes('patient_name')) return 'Maria Clara Santos';
  if (match.includes('status')) return 'Active';
  if (match.includes('patient_id')) return 'MAT-2026-0001';
  if (match.includes('age')) return '26';
  if (match.includes('gravida')) return 'G2P1';
  if (match.includes('contact')) return '0918 234 5678';
  if (match.includes('address')) return 'Centro St., Talimundoc, Orani, Bataan';
  if (match.includes('edd')) return 'Aug 15, 2026';
  if (match.includes('gestational_age')) return '31 weeks';
  if (match.includes('blood_type')) return 'O+';
  if (match.includes('allergies')) return 'None';
  if (match.includes('lmp')) return 'Nov 10, 2025';
  if (match.includes('philhealth')) return '12-345678901-2';
  if (match.includes('civil_status')) return 'Married';
  if (match.includes('notes')) return 'Patient is experiencing mild morning sickness. Prescribed prenatal vitamins.';
  if (match.includes('date(')) return 'Oct 10, 2026';
  if (match.includes('para')) return 'P1';
  if (match.includes('risk_level')) return 'Low Risk';
  if (match.includes('maternal_id')) return '1';
  return '';
});

// Add auth-guard.js and sidebar.js script tag if missing
if (!content.includes('sidebar.js')) {
  content = content.replace('<script src="supabase-config.js"></script>', '<script src="supabase-config.js"></script>\n    <script src="auth-guard.js"></script>\n    <script src="sidebar.js"></script>');
}

fs.writeFileSync('maternal-health.html', content, 'utf8');
console.log('Cleaned maternal-health.html successfully!');
