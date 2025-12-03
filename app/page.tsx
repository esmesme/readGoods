import { fetchMetadata } from "frames.js/next";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "Book Logger",
        description: "Log your reading journey.",
        other: {
            ...(await fetchMetadata(
                new URL("/api/frame", process.env.NEXT_PUBLIC_HOST || "http://localhost:3000")
            )),
        },
    };
}

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <main className="flex flex-col items-center justify-center flex-1 px-20 text-center">
                <h1 className="text-6xl font-bold">
                    Welcome to <a className="text-blue-600" href="/">Book Logger</a>
                </h1>
                <p className="mt-3 text-2xl">
                    A Farcaster Frame to log your books.
                </p>
            </main>
        </div>
    );
}
