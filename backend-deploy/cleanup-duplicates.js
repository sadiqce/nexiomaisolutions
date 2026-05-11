import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

const db = admin.firestore();

async function cleanupDuplicateFiles() {
  console.log('\n🧹 CLEANING UP DUPLICATE FILES\n');
  
  try {
    const filesSnapshot = await db.collection('files').get();
    console.log(`📊 Total files in database: ${filesSnapshot.size}`);
    
    // Group files by UserID + FileName
    const fileGroups = {};
    filesSnapshot.docs.forEach(doc => {
      const file = doc.data();
      const key = `${file.UserID}|${file.FileName}`;
      if (!fileGroups[key]) {
        fileGroups[key] = [];
      }
      fileGroups[key].push({ id: doc.id, data: file });
    });
    
    // Find duplicates
    let duplicatesFound = 0;
    let toDelete = [];
    
    Object.keys(fileGroups).forEach(key => {
      if (fileGroups[key].length > 1) {
        console.log(`\n⚠️  Duplicate found: ${key}`);
        console.log(`   Copies: ${fileGroups[key].length}`);
        fileGroups[key].forEach((f, idx) => {
          console.log(`   [${idx}] ${f.id} - Size: ${f.data.FileSize}, Status: ${f.data.Status}`);
        });
        
        // Keep the first one, mark others for deletion
        for (let i = 1; i < fileGroups[key].length; i++) {
          toDelete.push(fileGroups[key][i].id);
          duplicatesFound++;
        }
      }
    });
    
    console.log(`\n📋 Total duplicates to remove: ${duplicatesFound}`);
    
    if (toDelete.length === 0) {
      console.log('✅ No duplicates found!');
      process.exit(0);
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will DELETE the duplicate files!');
    console.log(`   Files to delete: ${toDelete.length}`);
    console.log('   Type "DELETE" to confirm, or anything else to cancel.');
    
    // For non-interactive mode, auto-delete
    const shouldDelete = process.argv[2] === '--auto-delete';
    
    if (shouldDelete) {
      console.log('\n▶️  Auto-delete mode: Removing duplicates...\n');
      
      let deleted = 0;
      for (const fileId of toDelete) {
        await db.collection('files').doc(fileId).delete();
        deleted++;
        console.log(`✓ Deleted: ${fileId}`);
      }
      
      console.log(`\n✅ Successfully deleted ${deleted} duplicate files`);
    } else {
      console.log('❌ Delete cancelled. Run with --auto-delete flag to remove duplicates.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupDuplicateFiles();
