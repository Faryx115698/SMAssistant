// supabase-live.js - Administrative Live CLI & Helper for Supabase
// Allows the AI assistant and developer to query, insert, update, and manage data live on Supabase.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xlsmuakkcicxwdllyrou.supabase.co";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";

const headers = {
  "apikey": SECRET_KEY,
  "Authorization": `Bearer ${SECRET_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

async function checkStatus() {
  console.log(`Connecting to ${SUPABASE_URL}...`);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
    if (!res.ok) {
      console.error(`Error connecting: ${res.status} ${res.statusText}`);
      return;
    }
    const meta = await res.json();
    const tables = Object.keys(meta.definitions || {});
    console.log(`Connection successful!`);
    if (tables.length === 0) {
      console.log(`⚠️ Schema status: No tables found in public schema.`);
      console.log(`Please run supabase-schema.sql in the Supabase SQL editor:`);
      console.log(`https://supabase.com/dashboard/project/xlsmuakkcicxwdllyrou/sql`);
    } else {
      console.log(`✅ Available tables (${tables.length}):`, tables.join(", "));
    }
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

async function queryTable(tableName, select = "*", limit = 10) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=${encodeURIComponent(select)}&limit=${limit}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.text();
      console.error(`Query failed [${res.status}]:`, err);
      return null;
    }
    const data = await res.json();
    console.log(`Records in '${tableName}' (showing up to ${limit}):`);
    console.table(data);
    return data;
  } catch (err) {
    console.error(`Query error:`, err.message);
    return null;
  }
}

async function insertRecord(tableName, record) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(record)
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`Insert failed [${res.status}]:`, err);
      return null;
    }
    const inserted = await res.json();
    console.log(`Successfully inserted into '${tableName}':`, inserted);
    return inserted;
  } catch (err) {
    console.error(`Insert error:`, err.message);
    return null;
  }
}

async function listUsers() {
  try {
    const url = `${SUPABASE_URL}/auth/v1/admin/users`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch users [${res.status}]:`, await res.text());
      return;
    }
    const data = await res.json();
    console.log(`Registered Auth Users (${data.users ? data.users.length : 0}):`);
    console.table((data.users || []).map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
  } catch (err) {
    console.error(`Auth list error:`, err.message);
  }
}

// CLI dispatcher
const [,, command, ...args] = process.argv;

(async () => {
  switch (command) {
    case "status":
      await checkStatus();
      break;
    case "users":
      await listUsers();
      break;
    case "get":
      await queryTable(args[0], args[1] || "*", parseInt(args[2] || "10"));
      break;
    case "insert":
      try {
        const payload = JSON.parse(args[1]);
        await insertRecord(args[0], payload);
      } catch (e) {
        console.error("Invalid JSON payload. Usage: node supabase-live.js insert <table_name> '<json_data>'");
      }
      break;
    default:
      await checkStatus();
      console.log(`
Usage:
  node supabase-live.js status                 - Check connection & available tables
  node supabase-live.js users                  - List registered auth users
  node supabase-live.js get <table_name>       - Query rows from a table
  node supabase-live.js insert <table> '<json>' - Insert a row into a table
      `);
  }
})();
