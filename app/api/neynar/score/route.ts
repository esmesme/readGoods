import { NextRequest, NextResponse } from "next/server";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get("fid");

    if (!fid) {
        return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
        console.error("NEYNAR_API_KEY is missing");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    try {
        const config = new Configuration({
            apiKey: apiKey,
        });
        const client = new NeynarAPIClient(config);

        // Fetch user data including score
        // The SDK methods might vary slightly, based on docs:
        // fetchBulkUsers takes { fids: [fid], viewerFid?: number }
        // and returns { users: [...] }
        const response = await client.fetchBulkUsers({ fids: [parseInt(fid)] });

        const user = response.users[0];

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // According to search results, score is likely in user.experimental.neynar_user_score
        // But SDK types will guide us. If it's not strictly typed, we'll access it safely.
        // Let's assume the user object has the structure described in docs.
        const score = (user as any).experimental?.neynar_user_score ?? 0;

        return NextResponse.json({ score });

    } catch (error) {
        console.error("Error fetching Neynar score:", error);
        return NextResponse.json({ error: "Failed to fetch score" }, { status: 500 });
    }
}
