import { storage } from './app.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

export async function uploadImage(file) {
    try {
        const storageRef = ref(storage, `images/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("✅ Image uploaded:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("❌ Error uploading image:", error);
        throw error;
    }
}
