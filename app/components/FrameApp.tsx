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
                setFarcasterUser(context.user);
                await sdk.actions.ready();
            } catch (e) {
                console.error("Error loading SDK:", e);
            }
        };
        if (sdk && !isSDKLoaded) {
            setIsSDKLoaded(true);
            load();
        }
    }, [isSDKLoaded]);

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
