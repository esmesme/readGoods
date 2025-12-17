import { db } from './firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, deleteDoc, addDoc, updateDoc, runTransaction, orderBy, limit, increment } from 'firebase/firestore';
import { BookData } from './openLibrary';
import { BookStatus, UserBook, ReadingLog } from './types';

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

        // Sanitize book object to remove undefined values
        const bookData = { ...book };
        Object.keys(bookData).forEach(key => {
            if ((bookData as any)[key] === undefined) {
                delete (bookData as any)[key];
            }
        });

        await setDoc(bookRef, {
            ...bookData,
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
            updatedAt: new Date(),
            bookTitle: book.title || 'Untitled',
        };

        if (book.author_name) dataToSave.bookAuthors = book.author_name;
        if (book.cover_i) dataToSave.coverId = book.cover_i;
        if (book.coverUrl) dataToSave.coverUrl = book.coverUrl;

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

export async function getNextUserNumber(): Promise<number> {
    const counterRef = doc(db, 'counters', 'users');

    return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentCount = 0;

        if (counterDoc.exists()) {
            currentCount = counterDoc.data().count || 0;
        }

        const nextCount = currentCount + 1;
        transaction.set(counterRef, { count: nextCount }, { merge: true });
        return nextCount;
    });
}

export async function saveUserProfile(user: { fid: number; username?: string; displayName?: string; pfpUrl?: string }) {
    try {
        const userRef = doc(db, USERS_COLLECTION, user.fid.toString());

        // Check if user exists to preserve or assign goodsID
        const userDoc = await getDoc(userRef);
        let goodsID: number | undefined;

        if (userDoc.exists()) {
            goodsID = userDoc.data().goodsID;
        }

        // If no join number, assign one
        if (goodsID === undefined) {
            goodsID = await getNextUserNumber();
        }

        // Sanitize user object
        const userData = { ...user };
        Object.keys(userData).forEach(key => {
            if ((userData as any)[key] === undefined) {
                delete (userData as any)[key];
            }
        });

        await setDoc(userRef, {
            ...userData,
            ...userData,
            goodsID, // Save the chronological ID
            // Default notificationsEnabled to false if not provided, or keep existing?
            // Let's rely on the passed userData to have it if we want to update it.
            // If it's undefined in userData, it will be deleted by the sanitizer above if we aren't careful.
            // But wait, the sanitizer only deletes undefined keys from userData.
            // So if we pass { notificationsEnabled: true }, it stays.
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
            ...doc.data(),
            id: doc.id,
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



export async function addReadingLog(userFid: number, bookKey: string, logData: { page: number; thoughts?: string; unit?: 'pages' | 'percent' | 'chapter'; skipped?: boolean }) {
    try {
        const docId = bookKey.replace('/works/', '');
        const userBookId = `${userFid}_${docId}`;
        const logsRef = collection(db, USER_BOOKS_COLLECTION, userBookId, 'logs');

        await addDoc(logsRef, {
            ...logData,
            date: new Date()
        });

        // Update the main userBook doc with latest page/progress if needed
        // If skipped, we do NOT update lastPageRead
        if (!logData.skipped) {
            const userBookRef = doc(db, USER_BOOKS_COLLECTION, userBookId);
            await updateDoc(userBookRef, {
                lastPageRead: logData.page,
                updatedAt: new Date()
            });
        }

    } catch (error) {
        console.error('Error adding reading log:', error);
        throw error;
    }
}

export async function getGlobalReviews(limitCount: number = 20): Promise<any[]> {
    try {
        const q = query(
            collection(db, USER_BOOKS_COLLECTION),
            where("review", "!=", ""), // Only get docs with non-empty reviews
            orderBy("updatedAt", "desc"),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const reviews: any[] = [];

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            reviews.push({
                ...data,
                id: doc.id
            });
        }

        return reviews;
    } catch (error) {
        console.error("Error fetching global reviews:", error);
        return [];
    }
}


export async function getUserProfile(fid: number): Promise<any | null> {
    try {
        const userRef = doc(db, USERS_COLLECTION, fid.toString());
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
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
    coverUrl?: string;
    createdBy: number;
    createdAt: any;
    updatedAt: any;
}

export async function addCustomBook(bookData: Omit<CustomBook, 'key' | 'createdAt' | 'updatedAt'>) {
    try {
        // Sanitize data to remove undefined values
        const safeBookData = { ...bookData };
        Object.keys(safeBookData).forEach(key => {
            if ((safeBookData as any)[key] === undefined) {
                delete (safeBookData as any)[key];
            }
        });

        const docRef = await addDoc(collection(db, CUSTOM_BOOKS_COLLECTION), {
            ...safeBookData,
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
                    coverUrl: data.coverUrl, // Custom cover URL if uploaded
                });
            }
        });

        return results;
    } catch (error) {
        console.error('Error searching custom books:', error);
        return [];
    }
}

export async function searchUsers(queryText: string): Promise<any[]> {
    try {
        const q = query(collection(db, USERS_COLLECTION));
        const querySnapshot = await getDocs(q);
        const results: any[] = [];
        const lowerQuery = queryText.toLowerCase();

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if ((data.username && data.username.toLowerCase().includes(lowerQuery)) ||
                (data.displayName && data.displayName.toLowerCase().includes(lowerQuery))) {
                results.push({
                    fid: data.fid,
                    username: data.username,
                    displayName: data.displayName,
                    pfpUrl: data.pfpUrl
                });
            }
        });
        return results;
    } catch (error) {
        console.error('Error searching users:', error);
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

        // Sanitize data
        const safeUpdates = { ...updates };
        Object.keys(safeUpdates).forEach(key => {
            if ((safeUpdates as any)[key] === undefined) {
                delete (safeUpdates as any)[key];
            }
        });

        await updateDoc(docRef, {
            ...safeUpdates,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error('Error updating custom book:', error);
        throw error;
    }
}

export async function awardPoints(userFid: number, amount: number): Promise<boolean> {
    try {
        const userRef = doc(db, USERS_COLLECTION, userFid.toString());
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const lastPointsDate = userData.lastPointsDate;
            const today = new Date().toISOString().split('T')[0];

            if (lastPointsDate === today) {
                console.log(`User ${userFid} already earned points today. Skipping.`);
                return false;
            }
        }

        await updateDoc(userRef, {
            currentPoints: increment(amount),
            lastPointsDate: new Date().toISOString().split('T')[0],
            updatedAt: new Date()
        });
        console.log(`Awarded ${amount} points to user ${userFid}`);
        return true;
    } catch (error) {
        console.error("Error awarding points:", error);
        return false;
    }
}

export async function getUsersWithNotificationsEnabled(): Promise<any[]> {
    try {
        const q = query(
            collection(db, USERS_COLLECTION),
            where("notificationsEnabled", "==", true)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            fid: parseInt(doc.id)
        }));
    } catch (error) {
        console.error("Error fetching users with notifications enabled:", error);
        return [];
    }
}

export async function sendNotification(fid: number, message: string): Promise<boolean> {
    // Stub for Sending Notification
    // In a real app, this would call the Farcaster API or a notification provider using the user's token.
    console.log(`[Simulated] Sending notification to FID ${fid}: "${message}"`);
    return true;
}

export async function getLeaderboard(limitCount: number = 100): Promise<any[]> {
    try {
        const q = query(
            collection(db, USERS_COLLECTION),
            orderBy("currentPoints", "desc"),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            fid: parseInt(doc.id) // Ensure FID is available
        }));
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
}

export async function toggleLikeReview(reviewId: string, userFid: number): Promise<boolean> {
    const reviewRef = doc(db, USER_BOOKS_COLLECTION, reviewId);
    const likeRef = doc(db, USER_BOOKS_COLLECTION, reviewId, 'likes', userFid.toString());

    try {
        let isLiked = false;
        await runTransaction(db, async (transaction) => {
            const likeDoc = await transaction.get(likeRef);
            if (likeDoc.exists()) {
                transaction.delete(likeRef);
                transaction.update(reviewRef, { likeCount: increment(-1) });
                isLiked = false;
            } else {
                transaction.set(likeRef, { likedAt: new Date() });
                transaction.update(reviewRef, { likeCount: increment(1) });
                isLiked = true;
            }
        });
        return isLiked;
    } catch (error) {
        console.error("Error toggling like:", error);
        throw error;
    }
}

export async function checkReviewLikeStatus(reviewId: string, userFid: number): Promise<boolean> {
    try {
        const likeRef = doc(db, USER_BOOKS_COLLECTION, reviewId, 'likes', userFid.toString());
        const likeDoc = await getDoc(likeRef);
        return likeDoc.exists();
    } catch (error) {
        console.error("Error checking like status:", error);
        return false;
    }
}
