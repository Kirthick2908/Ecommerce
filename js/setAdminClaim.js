const admin = require('firebase-admin');

// Replace with your service account key path
const serviceAccount = require('./ecommerce-1b9f4-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "ecommerce-1b9f4" // Ensure correct project
});

async function setAdminClaim() {
    try {
        // Replace with the exact UID from Firebase Authentication
        const uid = 'ORr9nFPvm2gYlOUlq4Imj4lOnwA2'; // e.g., 'l19sfcQXdyUVN0zbehzh1IQlX3v1'

        // Set the custom claim
        console.log(`Attempting to set admin claim for UID: ${uid}`);
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        console.log(`✅ Admin claim set for UID: ${uid}`);

        // Verify it was set
        const user = await admin.auth().getUser(uid);
        console.log('User details:', {
            email: user.email,
            uid: user.uid,
            customClaims: user.customClaims
        });

        if (user.customClaims && user.customClaims.admin) {
            console.log('✅ Verified: Admin claim is present');
        } else {
            console.log('❌ Verification failed: Admin claim not found');
        }
    } catch (error) {
        console.error('❌ Error setting/verifying admin claim:', error);
        if (error.code === 'auth/invalid-uid') {
            console.error('UID is invalid or doesn’t exist.');
        } else if (error.code === 'auth/insufficient-permission') {
            console.error('Service account lacks permission. Check IAM roles.');
        }
    } finally {
        process.exit(0);
    }
}

setAdminClaim();