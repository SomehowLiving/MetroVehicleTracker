
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase database...');
console.log('🔗 Host:', new URL(DATABASE_URL).hostname);

const client = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 1
});

async function setupDatabase() {
  try {
    // Test connection
    await client`SELECT 1`;
    console.log('✅ Database connection successful');

    // Check if tables exist
    const tables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('📋 Existing tables:', tables.map(t => t.table_name));

    if (tables.length === 0) {
      console.log('❌ No tables found. You need to run database migrations first.');
      console.log('💡 Run: npm run db:push');
    } else {
      console.log('✅ Database schema exists');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await client.end();
  }
}

setupDatabase();
