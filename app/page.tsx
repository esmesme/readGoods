import { fetchMetadata } from "frames.js/next";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "readGoods",
        description: "Log your reading journey.",
        other: {
            ...(await fetchMetadata(
                new URL("/api/frame", process.env.NEXT_PUBLIC_HOST || "http://localhost:3000")
            )),
        },
    };
}

import FrameApp from "./components/FrameApp";

export default function Page() {
    return <FrameApp />;
}
