import { db } from './firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { BookData } from './openLibrary';

const BOOKS_COLLECTION = 'books';
const USER_BOOKS_COLLECTION = 'userBooks';

export async function saveBookToFirestore(book: BookData, userFid: number) {
    try {
        const docId = book.key.replace('/works/', '');

        // Save to global books collection
        const bookRef = doc(db, BOOKS_COLLECTION, docId);
        await setDoc(bookRef, {
            ...book,
            updatedAt: new Date(),
        }, { merge: true });

        // Save to user's personal collection
        const userBookRef = doc(db, USER_BOOKS_COLLECTION, `${userFid}_${docId}`);
        await setDoc(userBookRef, {
            userFid,
            bookKey: book.key,
            bookTitle: book.title,
            bookAuthors: book.author_name,
            coverId: book.cover_i,
            loggedAt: new Date(),
        });

        console.log(`Book saved: ${book.title} for user ${userFid}`);
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
