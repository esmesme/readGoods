import { Metadata } from "next";
import FrameApp from "./components/FrameApp";

export const metadata: Metadata = {
    title: "readgoods",
    description: "Log your reading journey.",
    other: {
        "fc:frame": "vNext",
        "fc:frame:image": "https://read-goods.vercel.app/book-icon.png", // Placeholder, ideally absolute URL
        "fc:frame:button:1": "log your books to connect with others",
        "fc:frame:button:1:action": "link",
        "fc:frame:button:1:target": "https://read-goods.vercel.app", // Placeholder
    },
};

import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-neutral-500">Loading...</div>}>
            <FrameApp />
        </Suspense>
    );
}
