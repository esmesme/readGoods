"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Redirect({ to }: { to: string }) {
    const router = useRouter();

    useEffect(() => {
        if (to) {
            router.replace(to);
        }
    }, [to, router]);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold mb-4">Read Goods</h1>
            <div className="animate-pulse text-neutral-400">Redirecting to library...</div>
        </div>
    );
}
