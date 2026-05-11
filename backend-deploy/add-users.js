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

async function addUsers() {
  try {
    const users = [
      {
        UserID: '1oKFs5JIXRahyD71Q3MTJwTzolo2',
        Email: 'sadiqce85@yahoo.com',
        Username: 'sadiqce85',
        Tier: 'Standard',
        SubscriptionStatus: 'active',
        CreatedDate: '2026-03-18 01:48',
        UpdatedAt: new Date().toISOString(),
        StripeSubscriptionId: 'sub_1TQEPMJhozpSnVli0EkKk6AA',
        StripeSubscriptionStatus: 'active'
      },
      {
        UserID: '9L2USWvidwStGVhKnYGgIpwOYeF3',
        Email: 'sadiqce85@gmail.com',
        Username: 'sadiqce',
        Tier: 'Free',
        SubscriptionStatus: 'inactive',
        CreatedDate: '2026-04-07 01:34',
        UpdatedAt: new Date().toISOString()
      }
    ];

    for (const user of users) {
      await db.collection('users').doc(user.UserID).set(user);
      console.log('User created: ' + user.Username);
    }
    console.log('All users created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addUsers();
