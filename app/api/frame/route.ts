import { NextRequest, NextResponse } from "next/server";
import { getFrameMessage, getFrameHtmlResponse } from "frames.js/next/server";
import { searchBooks, BookData } from "@/lib/openLibrary";
import { saveBookToFirestore } from "@/lib/firestoreUtils";

type State = {
    step: 'home' | 'search' | 'result' | 'logged';
    book?: BookData;
};

const HOST = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const message = await getFrameMessage(body);

    let state: State = { step: 'home' };
    try {
        if (message.state) {
            state = JSON.parse(decodeURIComponent(message.state)) as State;
        }
    } catch (e) {
        // ignore error, default to home
    }

    // Handle interactions
    if (message.buttonIndex === 1 && state.step === 'home') {
        // User clicked "Search Book"
        return new NextResponse(
            getFrameHtmlResponse({
                buttons: [
                    { label: "Find", action: "post" },
                ],
                image: {
                    src: `${HOST}/images/search-placeholder.png`, // You might want to generate this dynamically
                    aspectRatio: "1.91:1",
                },
                input: {
                    text: "Enter ISBN or Title",
                },
                postUrl: `${HOST}/api/frame`,
                state: JSON.stringify({ step: 'search' }),
            })
        );
    }

    if (state.step === 'search' && message.inputText) {
        // User entered text and clicked "Find"
        const query = message.inputText;
        const books = await searchBooks(query);

        if (books.length > 0) {
            const book = books[0];
            const coverUrl = book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
                : `${HOST}/images/no-cover.png`;

            return new NextResponse(
                getFrameHtmlResponse({
                    buttons: [
                        { label: "Log This Book", action: "post" },
                        { label: "Try Again", action: "post" },
                    ],
                    image: {
                        src: coverUrl,
                        aspectRatio: "1.91:1",
                    },
                    postUrl: `${HOST}/api/frame`,
                    state: JSON.stringify({ step: 'result', book }),
                })
            );
        } else {
            return new NextResponse(
                getFrameHtmlResponse({
                    buttons: [
                        { label: "Try Again", action: "post" },
                    ],
                    image: {
                        src: `${HOST}/images/not-found.png`,
                        aspectRatio: "1.91:1",
                    },
                    postUrl: `${HOST}/api/frame`,
                    state: JSON.stringify({ step: 'search' }),
                })
            );
        }
    }

    if (state.step === 'result' && message.buttonIndex === 1 && state.book) {
        // User clicked "Log This Book"
        await saveBookToFirestore(state.book);

        return new NextResponse(
            getFrameHtmlResponse({
                buttons: [
                    { label: "Log Another", action: "post" },
                ],
                image: {
                    src: `${HOST}/images/success.png`,
                    aspectRatio: "1.91:1",
                },
                postUrl: `${HOST}/api/frame`,
                state: JSON.stringify({ step: 'home' }),
            })
        );
    }

    if (message.buttonIndex === 2 || (state.step === 'logged' && message.buttonIndex === 1)) {
        // "Try Again" or "Log Another" -> Go to Search or Home
        // Let's go to Search for "Try Again" and Home for "Log Another" (which resets state)
        // Actually, if buttonIndex is 2 in result, it's "Try Again", so go back to search

        return new NextResponse(
            getFrameHtmlResponse({
                buttons: [
                    { label: "Find", action: "post" },
                ],
                image: {
                    src: `${HOST}/images/search-placeholder.png`,
                    aspectRatio: "1.91:1",
                },
                input: {
                    text: "Enter ISBN or Title",
                },
                postUrl: `${HOST}/api/frame`,
                state: JSON.stringify({ step: 'search' }),
            })
        );
    }

    // Default Home
    return new NextResponse(
        getFrameHtmlResponse({
            buttons: [
                { label: "Search Book", action: "post" },
            ],
            image: {
                src: `${HOST}/images/home-placeholder.png`,
                aspectRatio: "1.91:1",
            },
            postUrl: `${HOST}/api/frame`,
            state: JSON.stringify({ step: 'home' }),
        })
    );
}

export async function GET(req: NextRequest) {
    // Initial Frame
    return new NextResponse(
        getFrameHtmlResponse({
            buttons: [
                { label: "Search Book", action: "post" },
            ],
            image: {
                src: `${HOST}/images/home-placeholder.png`,
                aspectRatio: "1.91:1",
            },
            postUrl: `${HOST}/api/frame`,
            state: JSON.stringify({ step: 'home' }),
        })
    );
}
