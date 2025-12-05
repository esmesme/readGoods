"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import SplashScreen from "./SplashScreen";
import MainApp from "./MainApp";

export default function FrameApp() {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [farcasterUser, setFarcasterUser] = useState<any>(null);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                setFarcasterUser(context?.user || null);
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

    return <MainApp farcasterUser={farcasterUser} />;
}
