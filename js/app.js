
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyA2ywd1iB09_SjbP3raC1btKqZKpO3h7aY",
    authDomain: "ecommerce-1b9f4.firebaseapp.com",
    projectId: "ecommerce-1b9f4",
    storageBucket: "ecommerce-1b9f4.appspot.com",
    messagingSenderId: "219939399872",
    appId: "1:219939399872:web:aa17ec1304c232a3892525"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
    cache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
const storage = getStorage(app);

export { auth, db, storage };

