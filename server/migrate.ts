import { db } from "./db";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { sql } from "drizzle-orm";

/**
 * Run database migrations for production deployment
 */
export async function ensureDatabaseReady(): Promise<void> {
  try {
    console.log('🔄 Ensuring database is ready...');
    
    // Ensure pgcrypto extension is available for gen_random_uuid()
    console.log('Creating required database extensions...');
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    
    // Check if we need to run migrations by checking if plumbers table exists
    console.log('Checking database schema state...');
    const result = await db.execute(sql`SELECT to_regclass('public.plumbers') as plumbers_table;`);
    
    if (!result.rows[0]?.plumbers_table) {
      // Tables don't exist, run migrations
      console.log('Running initial database migrations...');
      await migrate(db, { migrationsFolder: './migrations' });
    } else {
      // Tables already exist, just verify the schema is complete
      console.log('Database schema already exists, verifying...');
      
      // Check that auth_codes table exists (our new authentication tables)
      const authResult = await db.execute(sql`SELECT to_regclass('public.auth_codes') as auth_codes_table;`);
      if (!authResult.rows[0]?.auth_codes_table) {
        console.log('Missing authentication tables, running migrations...');
        // Only run migrations if auth tables are missing
        await migrate(db, { migrationsFolder: './migrations' });
      } else {
        console.log('All required tables verified');
      }
    }
    
    console.log('✅ Database is ready');
  } catch (error: any) {
    // If migration fails due to existing tables, just verify the schema
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Migration skipped (tables already exist), verifying schema...');
      try {
        const verifyResult = await db.execute(sql`SELECT to_regclass('public.plumbers') as plumbers_table;`);
        if (verifyResult.rows[0]?.plumbers_table) {
          console.log('✅ Database schema verified');
          return;
        }
      } catch (verifyError) {
        console.error('❌ Schema verification failed:', verifyError);
      }
    }
    
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}