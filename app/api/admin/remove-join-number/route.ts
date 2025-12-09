import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, deleteField } from 'firebase/firestore';

export async function POST() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const batch = writeBatch(db);
        let count = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.joinNumber !== undefined) {
                batch.update(doc.ref, {
                    joinNumber: deleteField()
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, count, message: `Removed joinNumber from ${count} users` });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 500 });
    }
}
