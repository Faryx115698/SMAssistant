// run-schema.js - Executes supabase-schema.sql using Supabase Management API
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'xlsmuakkcicxwdllyrou';
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.log('Usage: node run-schema.js <YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN_sbp_...>');
  process.exit(1);
}

const sqlPath = path.join(__dirname, 'supabase-schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function executeSchema() {
  console.log(`Executing supabase-schema.sql on project ${PROJECT_REF}...`);
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Execution failed (${res.status}):`, err);
      return;
    }

    const data = await res.json();
    console.log('✅ Schema execution successful!');
    console.log(data);
  } catch (err) {
    console.error('Error executing query:', err.message);
  }
}

executeSchema();
