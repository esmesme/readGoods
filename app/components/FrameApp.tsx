"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { searchBooks, BookData } from "@/lib/openLibrary";
import { saveBookToFirestore } from "@/lib/firestoreUtils";

export default function FrameApp() {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<BookData[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState("");

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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSavedMessage("");
        try {
            const results = await searchBooks(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleLogBook = async (book: BookData) => {
        setIsSaving(true);
        setSavedMessage("");
        try {
            await saveBookToFirestore(book);
            setSavedMessage(`✓ Logged "${book.title}"`);
            setSelectedBook(null);
            setTimeout(() => setSavedMessage(""), 3000);
        } catch (error) {
            console.error("Save error:", error);
            setSavedMessage("✗ Failed to save book");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        readGoods
                    </h1>
                    <p className="text-gray-600">Log your reading journey</p>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="mb-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title or ISBN..."
                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors font-medium"
                        >
                            {isSearching ? "Searching..." : "Search"}
                        </button>
                    </div>
                </form>

                {/* Saved Message */}
                {savedMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-center ${savedMessage.startsWith("✓")
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                        {savedMessage}
                    </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">
                            Search Results ({searchResults.length})
                        </h2>
                        {searchResults.map((book, index) => (
                            <div
                                key={`${book.key}-${index}`}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex gap-4">
                                    {book.cover_i && (
                                        <img
                                            src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                                            alt={book.title}
                                            className="w-16 h-24 object-cover rounded"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">
                                            {book.title}
                                        </h3>
                                        {book.author_name && (
                                            <p className="text-sm text-gray-600 mb-2">
                                                by {book.author_name.join(", ")}
                                            </p>
                                        )}
                                        {book.first_publish_year && (
                                            <p className="text-xs text-gray-500 mb-3">
                                                First published: {book.first_publish_year}
                                            </p>
                                        )}
                                        <button
                                            onClick={() => handleLogBook(book)}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                                        >
                                            {isSaving ? "Logging..." : "Log This Book"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isSearching && searchResults.length === 0 && searchQuery && (
                    <div className="text-center py-12 text-gray-500">
                        No books found. Try a different search term.
                    </div>
                )}

                {/* SDK Status */}
                <div className="mt-8 text-center text-xs text-gray-400">
                    {isSDKLoaded ? "SDK Ready" : "Loading SDK..."}
                </div>
            </div>
        </div>
    );
}
