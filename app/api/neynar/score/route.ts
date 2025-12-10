import { NextRequest, NextResponse } from "next/server";

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
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
            headers: {
                "accept": "application/json",
                "api_key": apiKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Neynar API error:", response.status, errorText);
            return NextResponse.json({ error: "Failed to fetch from Neynar" }, { status: response.status });
        }

        const data = await response.json();
        const user = data.users?.[0];

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Score logic: Check experimental features or user score
        // Neynar response structure for score might vary, using safe access
        const score = user.experimental?.neynar_user_score ?? 0;

        return NextResponse.json({ score });

    } catch (error) {
        console.error("Error fetching Neynar score:", error);
        return NextResponse.json({ error: "Failed to fetch score" }, { status: 500 });
    }
}
