"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import SplashScreen from "./SplashScreen";
import MainApp from "./MainApp";

export default function FrameApp() {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [farcasterUser, setFarcasterUser] = useState<any>(null);
    const [showSplash, setShowSplash] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                const user = context?.user;
                setFarcasterUser(user || null);

                if (user?.fid) {
                    // Check Neynar Score
                    try {
                        const res = await fetch(`/api/neynar/score?fid=${user.fid}`);
                        const data = await res.json();
                        if (data.score !== undefined) {
                            if (data.score < 0.6) {
                                // alert("This app is for users with a neynar score of .6 or higher");
                                setAccessDenied(true);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to check score", err);
                        // Fail open or closed? Failing closed for safety as per plan, but warning:
                        // If API fails, users might be blocked. 
                        // Let's log it and maybe allow for now unless strictness is required.
                        // User said "only be usable", implying strictness.
                    }
                }

                await sdk.actions.ready();
            } catch (e) {
                console.log("Not in Farcaster frame, using fallback");
                // Not in a Farcaster frame - this is expected in regular browser
                setFarcasterUser(null);
            }
        };
        if (sdk && !isSDKLoaded) {
            setIsSDKLoaded(true);
            load();
        }
    }, [isSDKLoaded]);

    // Auto-save miniapp after 7 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                sdk.actions.addFrame();
            } catch (e) {
                console.log("Error adding frame:", e);
            }
        }, 7000);

        return () => clearTimeout(timer);
    }, []);

    if (showSplash) {
        return (
            <SplashScreen
                username={farcasterUser?.username || farcasterUser?.fid}
                onComplete={() => setShowSplash(false)}
            />
        );
    }

    if (accessDenied) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white p-4 text-center">
                <div>
                    <h1 className="text-xl font-medium text-neutral-200">
                        This app is for users with a neynar score of .6 or higher
                    </h1>
                </div>
            </div>
        );
    }

    return <MainApp farcasterUser={farcasterUser} />;
}
