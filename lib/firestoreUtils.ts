import { db } from './firebase';
import { BookData } from './openLibrary';

const BOOKS_COLLECTION = 'books';

export async function saveBookToFirestore(book: BookData) {
    try {
        // Use Open Library key as document ID to prevent duplicates
        // Key usually looks like "/works/OL123W", we'll strip the prefix or just use it as is if compatible
        const docId = book.key.replace('/works/', '');

        const docRef = db.collection(BOOKS_COLLECTION).doc(docId);

        await docRef.set({
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
        const doc = await db.collection(BOOKS_COLLECTION).doc(docId).get();
        return doc.exists;
    } catch (error) {
        console.error('Error checking book existence:', error);
        return false;
    }
}
