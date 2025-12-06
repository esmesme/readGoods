import { db } from './firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { BookData } from './openLibrary';
import { BookStatus, UserBook } from './types';

const BOOKS_COLLECTION = 'books';
const USER_BOOKS_COLLECTION = 'userBooks';
const USERS_COLLECTION = 'users';

// Helper function to get the document ID for a book
function getBookDocId(book: BookData): string {
    return book.key.replace('/works/', '');
}

export async function saveBookToFirestore(
    book: BookData,
    userFid: number,
    status: BookStatus,
    review?: string
) {
    try {
        const bookDocId = getBookDocId(book);

        // 1. Save/Update the book details in 'books' collection
        const bookRef = doc(db, BOOKS_COLLECTION, bookDocId);
        await setDoc(bookRef, {
            ...book,
            updatedAt: new Date()
        }, { merge: true });

        // 2. Save/Update the user's relationship to the book
        // We use a composite ID: `${userFid}_${bookDocId}`
        const userBookId = `${userFid}_${bookDocId}`;
        const userBookRef = doc(db, USER_BOOKS_COLLECTION, userBookId);

        const dataToSave: any = {
            userFid,
            bookKey: book.key, // Store the full book key here
            status,
            updatedAt: new Date()
        };

        if (status === 'current') {
            dataToSave.startedReadingAt = new Date();
        }

        if (review !== undefined) {
            dataToSave.review = review;
        }

        await setDoc(userBookRef, dataToSave, { merge: true });

        console.log(`Saved book ${book.key} for user ${userFid} with status ${status}`);
        return bookDocId;
    } catch (error) {
        console.error("Error saving book to Firestore:", error);
        throw error;
    }
}

export async function saveUserProfile(user: { fid: number; username?: string; displayName?: string; pfpUrl?: string }) {
    try {
        const userRef = doc(db, USERS_COLLECTION, user.fid.toString());
        await setDoc(userRef, {
            ...user,
            updatedAt: new Date(),
        }, { merge: true });
    } catch (error) {
        console.error('Error saving user profile:', error);
        // Don't throw, just log - this shouldn't block app usage
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

export async function getBookUsers(bookKey: string): Promise<{ userFid: number; status: BookStatus; username?: string; displayName?: string; pfpUrl?: string; review?: string }[]> {
    try {
        const q = query(collection(db, USER_BOOKS_COLLECTION), where("bookKey", "==", bookKey));
        const querySnapshot = await getDocs(q);

        const userBooks = querySnapshot.docs.map(doc => ({
            userFid: doc.data().userFid,
            status: doc.data().status as BookStatus,
            review: doc.data().review as string | undefined
        }));

        // Fetch user profiles for each user
        const usersWithProfiles = await Promise.all(userBooks.map(async (ub) => {
            try {
                const userDoc = await getDoc(doc(db, USERS_COLLECTION, ub.userFid.toString()));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    return {
                        ...ub,
                        username: userData.username,
                        displayName: userData.displayName,
                        pfpUrl: userData.pfpUrl
                    };
                }
            } catch (e) {
                console.error(`Error fetching profile for ${ub.userFid}:`, e);
            }
            return ub;
        }));

        return usersWithProfiles;
    } catch (error) {
        console.error("Error getting book users:", error);
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

export async function deleteUserBook(userFid: number, bookKey: string) {
    try {
        const docId = bookKey.replace('/works/', '');
        const userBookRef = doc(db, USER_BOOKS_COLLECTION, `${userFid}_${docId}`);
        await deleteDoc(userBookRef);
    } catch (error) {
        console.error('Error deleting user book:', error);
        throw error;
    }
}

export interface ReadingLog {
    id?: string;
    page: number;
    thoughts?: string;
    date: any; // Timestamp
}

export async function addReadingLog(userFid: number, bookKey: string, logData: { page: number; thoughts?: string }) {
    try {
        const docId = bookKey.replace('/works/', '');
        const userBookId = `${userFid}_${docId}`;
        const logsRef = collection(db, USER_BOOKS_COLLECTION, userBookId, 'logs');

        await addDoc(logsRef, {
            ...logData,
            date: new Date()
        });

        // Update the main userBook doc with latest page/progress if needed
        const userBookRef = doc(db, USER_BOOKS_COLLECTION, userBookId);
        await updateDoc(userBookRef, {
            lastPageRead: logData.page,
            updatedAt: new Date()
        });

    } catch (error) {
        console.error('Error adding reading log:', error);
        throw error;
    }
}

export async function getReadingLogs(userFid: number, bookKey: string): Promise<ReadingLog[]> {
    try {
        const docId = bookKey.replace('/works/', '');
        const userBookId = `${userFid}_${docId}`;
        const logsRef = collection(db, USER_BOOKS_COLLECTION, userBookId, 'logs');

        // Order by date
        // Note: You might need to create an index in Firestore for this query
        // For now, we'll fetch all and sort client-side if needed, but 'orderBy' is better
        // const q = query(logsRef, orderBy('date', 'asc')); 
        // Let's stick to simple fetch and sort in JS to avoid index creation requirements for now

        const querySnapshot = await getDocs(logsRef);
        const logs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ReadingLog));

        return logs.sort((a, b) => (a.date.seconds - b.date.seconds));
    } catch (error) {
        console.error('Error getting reading logs:', error);
        return [];
    }
}

const CUSTOM_BOOKS_COLLECTION = 'custom_books';

export interface CustomBook {
    key: string;
    title: string;
    author_name: string[];
    first_publish_year?: number;
    description?: string;
    subjects?: string[];
    createdBy: number;
    createdAt: any;
    updatedAt: any;
}

export async function addCustomBook(bookData: Omit<CustomBook, 'key' | 'createdAt' | 'updatedAt'>) {
    try {
        const docRef = await addDoc(collection(db, CUSTOM_BOOKS_COLLECTION), {
            ...bookData,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Update the doc with its own key for easier reference
        await updateDoc(docRef, { key: `custom_${docRef.id}` });

        return `custom_${docRef.id}`;
    } catch (error) {
        console.error('Error adding custom book:', error);
        throw error;
    }
}

export async function searchCustomBooks(queryText: string): Promise<BookData[]> {
    try {
        // Simple client-side filtering for now as Firestore doesn't support full-text search natively
        // and the dataset is expected to be small initially.
        const q = query(collection(db, CUSTOM_BOOKS_COLLECTION));
        const querySnapshot = await getDocs(q);

        const results: BookData[] = [];
        const lowerQuery = queryText.toLowerCase();

        querySnapshot.forEach((doc) => {
            const data = doc.data() as CustomBook;
            if (data.title.toLowerCase().includes(lowerQuery) ||
                data.author_name.some(author => author.toLowerCase().includes(lowerQuery))) {
                results.push({
                    key: data.key || `custom_${doc.id}`,
                    title: data.title,
                    author_name: data.author_name,
                    first_publish_year: data.first_publish_year,
                    cover_i: undefined, // Custom books won't have OL covers by default
                });
            }
        });

        return results;
    } catch (error) {
        console.error('Error searching custom books:', error);
        return [];
    }
}

export async function getCustomBookDetails(key: string): Promise<any> {
    try {
        const docId = key.replace('custom_', '');
        const docRef = doc(db, CUSTOM_BOOKS_COLLECTION, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as CustomBook;
            return {
                title: data.title,
                description: data.description || '',
                authors: data.author_name.map(name => ({ name })),
                subjects: data.subjects || [],
                publish_date: data.first_publish_year?.toString(),
                isCustom: true,
                key: data.key
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting custom book details:', error);
        return null;
    }
}

export async function updateCustomBook(key: string, updates: Partial<CustomBook>) {
    try {
        const docId = key.replace('custom_', '');
        const docRef = doc(db, CUSTOM_BOOKS_COLLECTION, docId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error('Error updating custom book:', error);
        throw error;
    }
}
