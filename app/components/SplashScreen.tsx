"use client";

import { useState, useEffect } from "react";

interface SplashScreenProps {
    username?: string;
    onComplete: () => void;
}

export default function SplashScreen({ username, onComplete }: SplashScreenProps) {
    const [fadeIn, setFadeIn] = useState(false);

    useEffect(() => {
        // Start fade in animation
        setTimeout(() => setFadeIn(true), 100);
    }, []);

    return (
        <div
            className="min-h-screen bg-black flex flex-col items-center justify-center cursor-pointer"
            onClick={onComplete}
        >
            <div
                className={`transition-opacity duration-1000 ${fadeIn ? "opacity-100" : "opacity-0"
                    }`}
            >
                <h1 className="text-white font-bold text-5xl md:text-7xl letter-spacing-wide mb-8 px-4 text-center">
                    READ GOOD
                </h1>
                {username && (
                    <p className="text-white font-light text-xl text-center letter-spacing-wide">
                        WELCOME {username.toUpperCase()}
                    </p>
                )}
            </div>
        </div>
    );
}
