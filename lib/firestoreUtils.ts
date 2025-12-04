import { db } from './firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { BookData } from './openLibrary';

const BOOKS_COLLECTION = 'books';

export async function saveBookToFirestore(book: BookData) {
    try {
        const docId = book.key.replace('/works/', '');
        const docRef = doc(db, BOOKS_COLLECTION, docId);

        await setDoc(docRef, {
            ...book,
            updatedAt: new Date(),
        }, { merge: true });

        console.log(`Book saved: ${book.title} (${docId})`);
        return docId;
    } catch (error) {
        console.error('Error saving book to Firestore:', error);
        throw error;
    }
}

export async function checkBookExists(key: string): Promise<boolean> {
    try {
        const docId = key.replace('/works/', '');
        const docRef = doc(db, BOOKS_COLLECTION, docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (error) {
        console.error('Error checking book existence:', error);
        return false;
    }
}
