// Migration script to populate Firestore from CSV data
// Run: npm install csv-parse && node migrate-csv-to-firestore.js

import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!firebaseConfig.projectId || !firebaseConfig.privateKey || !firebaseConfig.clientEmail) {
      console.error('[FIREBASE] Missing credentials');
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
    console.log('[FIREBASE] Admin SDK initialized');
  } catch (error) {
    console.error('[FIREBASE] Init error:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Helper to parse CSV
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const stream = createReadStream(filePath);

    stream.pipe(parse({ 
      columns: true,
      skip_empty_lines: true,
      trim: true 
    }))
    .on('data', (data) => records.push(data))
    .on('error', reject)
    .on('end', () => resolve(records));
  });
}

// Helper to clean empty values
function cleanRecord(record) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    if (value && value.trim()) {
      cleaned[key] = value.trim();
    }
  }
  return cleaned;
}

// Migrate Users
async function migrateUsers() {
  console.log('\n📝 Migrating Users...');
  try {
    const users = await parseCSV(path.join(process.cwd(), 'users.csv'));
    
    for (const user of users) {
      const cleaned = cleanRecord(user);
      if (!cleaned.UserID) continue;

      const userData = {
        UserID: cleaned.UserID,
        Email: cleaned.Email?.toLowerCase() || '',
        Username: cleaned.Username || '',
        Tier: cleaned.Tier || 'Free',
        SubscriptionStatus: cleaned.SubscriptionStatus || 'inactive',
        CreatedDate: cleaned.CreatedDate || new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      // Add optional fields if present
      if (cleaned.PendingTier) userData.PendingTier = cleaned.PendingTier;
      if (cleaned.PendingActivationDate) userData.PendingActivationDate = cleaned.PendingActivationDate;
      if (cleaned.LastPaymentDate) userData.LastPaymentDate = cleaned.LastPaymentDate;
      if (cleaned.SubscriptionEndDate) userData.SubscriptionEndDate = cleaned.SubscriptionEndDate;
      if (cleaned.StripeSubscriptionId) userData.StripeSubscriptionId = cleaned.StripeSubscriptionId;
      if (cleaned.StripeSubscriptionStatus) userData.StripeSubscriptionStatus = cleaned.StripeSubscriptionStatus;
      if (cleaned.stripePriceId) userData.stripePriceId = cleaned.stripePriceId;
      if (cleaned.AutoRenewal) userData.AutoRenewal = cleaned.AutoRenewal === 'checked';

      await db.collection('users').doc(cleaned.UserID).set(userData);
      console.log(`  ✅ User created: ${cleaned.Username || cleaned.Email}`);
    }
    console.log(`✅ Migrated ${users.length} users`);
  } catch (error) {
    console.error('❌ Error migrating users:', error.message);
  }
}

// Migrate Files
async function migrateFiles() {
  console.log('\n📝 Migrating Files...');
  try {
    const files = await parseCSV(path.join(process.cwd(), 'files.csv'));
    
    for (const file of files) {
      const cleaned = cleanRecord(file);
      if (!cleaned.UserID) continue;

      const fileData = {
        UserID: cleaned.UserID,
        FileName: cleaned.NewFileName || cleaned.OriginalFileName || '',
        OriginalFileName: cleaned.OriginalFileName || '',
        FileSize: parseInt(cleaned.FileSize) || 0,
        UploadedAt: cleaned.UploadTimestamp || new Date().toISOString(),
        URL: cleaned.DownloadLink || '',
        Status: cleaned.Status || 'Pending',
        UpdatedAt: new Date().toISOString(),
      };

      if (cleaned.PageCount) fileData.PageCount = parseInt(cleaned.PageCount);
      if (cleaned.UserTier) fileData.UserTier = cleaned.UserTier;

      const fileRef = await db.collection('files').add(fileData);
      console.log(`  ✅ File created: ${fileData.FileName}`);
    }
    console.log(`✅ Migrated ${files.length} files`);
  } catch (error) {
    console.error('❌ Error migrating files:', error.message);
  }
}

// Migrate Compliance Ledger
async function migrateComplianceLedger() {
  console.log('\n📝 Migrating Compliance Ledger...');
  try {
    const records = await parseCSV(path.join(process.cwd(), 'compliance-ledger.csv'));
    
    for (const record of records) {
      const cleaned = cleanRecord(record);
      if (!cleaned.Id) continue;

      const complianceData = {
        Lot_Number: cleaned.Lot_Number || '',
        Material: cleaned.Material || '',
        S3_Key: cleaned.S3_Key || '',
        Test_Date: cleaned.Test_Date || new Date().toISOString(),
        CreatedAt: new Date().toISOString(),
      };

      await db.collection('compliance-ledger').doc(cleaned.Id).set(complianceData);
      console.log(`  ✅ Compliance record created: ${cleaned.Material}`);
    }
    console.log(`✅ Migrated ${records.length} compliance records`);
  } catch (error) {
    console.error('❌ Error migrating compliance ledger:', error.message);
  }
}

// Main migration
async function migrate() {
  console.log('🚀 Starting Firestore migration from CSVs...\n');
  
  try {
    await migrateUsers();
    await migrateFiles();
    await migrateComplianceLedger();
    
    console.log('\n✅ Migration complete!');
    console.log('📦 Firestore collections populated successfully');
    console.log('🚀 Ready to deploy to Heroku');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
