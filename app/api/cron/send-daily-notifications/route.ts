
import { NextRequest, NextResponse } from 'next/server';
import { getUsersWithNotificationsEnabled, sendNotification, getUserProfile } from '@/lib/firestoreUtils';

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(request: NextRequest) {
    // Optional: Add simple secret check to prevent unauthorized triggering
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    try {
        const users = await getUsersWithNotificationsEnabled();
        console.log(`[Cron] Found ${users.length} users with notifications enabled.`);

        let sentCount = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const user of users) {
            // Optional: Check if they already earned points today to avoid spamming?
            // The prompt implies "Earn daily points ... by logging ... today".
            // If they already earned points, maybe we don't need to notify?
            // Let's check their profile again for fresh data
            const profile = await getUserProfile(user.fid);
            if (profile && profile.lastPointsDate === today) {
                console.log(`[Cron] User ${user.fid} already earned points today. Skipping notification.`);
                continue;
            }

            const message = "Earn daily points for the READERBOARD by logging your pages read (or not-read) today!";
            const success = await sendNotification(user.fid, message);
            if (success) sentCount++;
        }

        return NextResponse.json({ success: true, sentCount, totalEnabled: users.length });
    } catch (error) {
        console.error("Cron job failed:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
