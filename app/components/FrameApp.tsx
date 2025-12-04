"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

export default function FrameApp() {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                await sdk.actions.ready();
            } catch (e) {
                console.error("Error calling sdk.actions.ready:", e);
            }
        };
        if (sdk && !isSDKLoaded) {
            setIsSDKLoaded(true);
            load();
        }
    }, [isSDKLoaded]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <main className="flex flex-col items-center justify-center flex-1 px-20 text-center">
                <h1 className="text-6xl font-bold">
                    Welcome to <a className="text-blue-600" href="/">readGoods</a>
                </h1>
                <p className="mt-3 text-2xl">
                    A Farcaster Frame to log your books.
                </p>
                <div className="mt-8">
                    <p className="text-sm text-gray-500">
                        {isSDKLoaded ? "SDK Loaded" : "Loading SDK..."}
                    </p>
                </div>
            </main>
        </div>
    );
}
