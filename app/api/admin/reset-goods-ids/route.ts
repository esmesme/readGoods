import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, runTransaction, doc } from 'firebase/firestore';

export async function POST() {
    try {
        const usersRef = collection(db, 'users');
        const counterRef = doc(db, 'counters', 'users');

        const result = await runTransaction(db, async (transaction) => {
            const snapshot = await getDocs(usersRef);

            const users = snapshot.docs.map(d => ({
                ref: d.ref,
                data: d.data()
            }));

            // Defined mappings
            const idMap: Record<number, number> = {
                999999: 0,
                1020698: 1,
                1044526: 2
            };

            const assignedRefs = new Set<string>();
            let maxId = 2; // Starting max ID based on manual assignments

            // 1. Assign specific IDs
            for (const user of users) {
                const fid = user.data.fid;
                if (idMap[fid] !== undefined) {
                    transaction.set(user.ref, { goodsID: idMap[fid] }, { merge: true });
                    assignedRefs.add(user.ref.id);
                }
            }

            // 2. Assign remaining chronological IDs starting from 3
            const unassignedUsers = users.filter(u => !assignedRefs.has(u.ref.id));

            // Sort unassigned users by createdAt (oldest first), fallback to FID
            unassignedUsers.sort((a, b) => {
                const timeA = a.data.createdAt?.toMillis() || 0;
                const timeB = b.data.createdAt?.toMillis() || 0;
                if (timeA !== timeB) return timeA - timeB;
                return (a.data.fid || 0) - (b.data.fid || 0);
            });

            let nextId = 3;
            for (const user of unassignedUsers) {
                transaction.set(user.ref, { goodsID: nextId }, { merge: true });
                maxId = nextId;
                nextId++;
            }

            // 3. Update counter to the last assigned ID
            // The getNextUserNumber function increments current count + 1 and returns it.
            // So if maxId is 15, next user gets 16.
            // So we should set counter to 15.
            transaction.set(counterRef, { count: maxId }, { merge: true });

            return {
                success: true,
                manualAssignments: Object.keys(idMap).length,
                autoAssignments: unassignedUsers.length,
                totalUsers: users.length,
                maxId
            };
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Reset IDs error:", error);
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 500 });
    }
}
