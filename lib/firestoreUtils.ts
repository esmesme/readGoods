import { db } from './firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { BookData } from './openLibrary';
import { BookStatus, UserBook } from './types';

const BOOKS_COLLECTION = 'books';
const USER_BOOKS_COLLECTION = 'userBooks';

export async function saveBookToFirestore(book: BookData, userFid: number, status: BookStatus) {
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
            status,
            loggedAt: new Date(),
            updatedAt: new Date(),
        }, { merge: true });
        return docId;
    } catch (error) {
        console.error('Error saving book to Firestore:', error);
        throw error;
    }
}

export async function getUserBooks(userFid: number): Promise<UserBook[]> {
    try {
        const q = query(
            collection(db, USER_BOOKS_COLLECTION),
            where('userFid', '==', userFid)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as UserBook);
    } catch (error) {
        console.error('Error getting user books:', error);
        return [];
    }
}

export async function updateBookStatus(userFid: number, bookKey: string, status: BookStatus) {
    try {
        const docId = bookKey.replace('/works/', '');
        const userBookRef = doc(db, USER_BOOKS_COLLECTION, `${userFid}_${docId}`);
        await setDoc(userBookRef, {
            status,
            updatedAt: new Date(),
        }, { merge: true });
    } catch (error) {
        console.error('Error updating book status:', error);
        throw error;
    }
}

export async function getBookUsers(bookKey: string): Promise<{ userFid: number; status: BookStatus }[]> {
    try {
        const docId = bookKey.replace('/works/', '');
        const q = query(
            collection(db, USER_BOOKS_COLLECTION),
            where('bookKey', '==', bookKey)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { userFid: data.userFid, status: data.status };
        });
    } catch (error) {
        console.error('Error getting book users:', error);
        return [];
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
