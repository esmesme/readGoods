import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, runTransaction, doc, orderBy } from 'firebase/firestore';

export async function POST() {
    try {
        const usersRef = collection(db, 'users');
        const counterRef = doc(db, 'counters', 'users');

        const result = await runTransaction(db, async (transaction) => {
            // Get all users
            // Ideally we'd sort by createdAt, but if that's missing we might need fallback
            // For now, let's fetch all and sort in memory if needed, or query ordered
            const q = query(usersRef); // We'll fetch all and sort in JS to be safe about missing fields
            const snapshot = await getDocs(q);

            const users = snapshot.docs.map(d => ({
                ref: d.ref,
                data: d.data()
            }));

            // Filter out users who already have a goodsID
            const usersNeedingId = users.filter(u => u.data.goodsID === undefined);

            if (usersNeedingId.length === 0) {
                return { count: 0, message: "No users need backfill" };
            }

            // Sort by createdAt (oldest first), fallback to FID if createdAt missing
            // This is "best effort" chronological
            usersNeedingId.sort((a, b) => {
                const timeA = a.data.createdAt?.toMillis() || 0;
                const timeB = b.data.createdAt?.toMillis() || 0;
                if (timeA !== timeB) return timeA - timeB;
                return (a.data.fid || 0) - (b.data.fid || 0);
            });

            // Get current counter
            const counterDoc = await transaction.get(counterRef);
            let currentCount = 0;
            if (counterDoc.exists()) {
                currentCount = counterDoc.data().count || 0;
            }

            // We need to be careful not to double count if we already have some users with IDs
            // But since we are filtering for users without goodsID, we are just appending or backfilling
            // If we are renaming, we might want to check if they have joinNumber and migrate it?
            // For simplicity in this request, we are treating goodsID as a new field.
            // If we want to restart the counter for goodsID to match joinNumber logic, we might need to reset counter?
            // Assuming we just want to ensure everyone has a goodsID.

            // To be safe and keep numbers contiguous and starting from 1 if this is a fresh start for "goodsID":
            // If we want "goodsID" to replace "joinNumber" completely, we should probably reset if no one has "goodsID" yet?
            // But the counter is global for 'users'.

            // Let's assume we proceed with the current counter.
            let nextCount = currentCount;

            // Assign numbers
            for (const user of usersNeedingId) {
                nextCount++;
                transaction.set(user.ref, { goodsID: nextCount }, { merge: true });
            }

            // Update counter
            transaction.set(counterRef, { count: nextCount }, { merge: true });

            return { count: usersNeedingId.length, lastId: nextCount };
        });

        return NextResponse.json({ success: true, ...result });

    } catch (error) {
        console.error("Backfill error:", error);
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 500 });
    }
}
