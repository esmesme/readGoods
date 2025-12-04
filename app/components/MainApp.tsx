"use client";

import { useState, useEffect } from "react";
import { searchBooks, BookData, getBookDetails } from "@/lib/openLibrary";
import { saveBookToFirestore, getUserBooks, updateBookStatus, getBookUsers } from "@/lib/firestoreUtils";
import { BookStatus, UserBook } from "@/lib/types";

interface MainAppProps {
    farcasterUser: any;
}

export default function MainApp({ farcasterUser }: MainAppProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | BookStatus>('all');
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<BookData[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userBooks, setUserBooks] = useState<UserBook[]>([]);
    const [selectedBook, setSelectedBook] = useState<(BookData & { userStatus?: BookStatus }) | null>(null);
    const [bookDetails, setBookDetails] = useState<any>(null);
    const [bookUsers, setBookUsers] = useState<{ userFid: number; status: BookStatus }[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        if (farcasterUser?.fid) {
            loadUserBooks();
        }
    }, [farcasterUser]);

    const loadUserBooks = async () => {
        if (!farcasterUser?.fid) return;
        const books = await getUserBooks(farcasterUser.fid);
        setUserBooks(books);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await searchBooks(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddBook = async (book: BookData, status: BookStatus) => {
        console.log("Adding book:", book.title, "Status:", status, "User FID:", farcasterUser?.fid);
        if (!farcasterUser?.fid) {
            console.error("No user FID found");
            return;
        }
        try {
            await saveBookToFirestore(book, farcasterUser.fid, status);
            console.log("Book saved to Firestore");
            await loadUserBooks();
            console.log("User books reloaded");
            setSearchResults([]);
            setSearchQuery("");
        } catch (error) {
            console.error("Error adding book:", error);
        }
    };

    const handleBookClick = async (book: UserBook | BookData) => {
        const userStatus = 'status' in book ? book.status : undefined;
        setSelectedBook({ ...book, userStatus } as any);
        setLoadingDetails(true);

        // Load detailed book info
        const bookKey = 'bookKey' in book ? book.bookKey : book.key;
        const details = await getBookDetails(bookKey);
        setBookDetails(details);

        // Load users who have this book
        const users = await getBookUsers(bookKey);
        setBookUsers(users);
        setLoadingDetails(false);
    };

    const handleStatusChange = async (newStatus: BookStatus) => {
        if (!farcasterUser?.fid || !selectedBook) return;
        try {
            const bookKey = ('bookKey' in selectedBook ? selectedBook.bookKey : selectedBook.key) as string;
            await updateBookStatus(farcasterUser.fid, bookKey, newStatus);
            await loadUserBooks();
            setSelectedBook({ ...selectedBook, userStatus: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const filteredBooks = filter === 'all'
        ? userBooks
        : userBooks.filter(book => book.status === filter);

    const getStatusIcon = (status: BookStatus) => {
        switch (status) {
            case 'desired': return '📖';
            case 'current': return '📚';
            case 'completed': return '✓';
        }
    };

    const getLibraryTagline = () => {
        const username = farcasterUser?.username || 'User';
        switch (filter) {
            case 'all': return `All of ${username}'s books`;
            case 'current': return `${username} is currently reading...`;
            case 'completed': return `${username}'s completed books`;
            case 'desired': return `${username} wants to read`;
        }
    };

    if (selectedBook) {
        return (
            <div className="min-h-screen bg-white p-4">
                <button
                    onClick={() => {
                        setSelectedBook(null);
                        setBookDetails(null);
                    }}
                    className="mb-4 text-black hover:underline"
                >
                    ← Back
                </button>

                <div className="max-w-2xl mx-auto">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">{(selectedBook as any).title || (selectedBook as any).bookTitle}</h2>
                        {(selectedBook as any).author_name && (
                            <p className="text-gray-600 text-sm mb-4">by {(selectedBook as any).author_name.join(", ")}</p>
                        )}

                        <div className="mb-4">
                            {((selectedBook as any).cover_i || (selectedBook as any).coverId) && (
                                <img
                                    src={`https://covers.openlibrary.org/b/id/${(selectedBook as any).cover_i || (selectedBook as any).coverId}-L.jpg`}
                                    alt={(selectedBook as any).title || (selectedBook as any).bookTitle}
                                    className="w-48 h-auto rounded shadow-lg mb-4"
                                />
                            )}
                        </div>

                        {selectedBook.userStatus && (
                            <div className="mb-4">
                                <p className="text-sm font-semibold mb-2">Change Status:</p>
                                <div className="flex gap-2">
                                    {(['desired', 'current', 'completed'] as BookStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                            className={`px-4 py-2 rounded border ${selectedBook.userStatus === status
                                                ? 'bg-black text-white'
                                                : 'bg-white text-black border-black hover:bg-gray-100'
                                                }`}
                                        >
                                            {getStatusIcon(status)} {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!selectedBook.userStatus && farcasterUser && (
                            <div className="mb-4">
                                <p className="text-sm font-semibold mb-2">Add to Library:</p>
                                <div className="flex gap-2">
                                    {(['desired', 'current', 'completed'] as BookStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={async () => {
                                                await handleAddBook(selectedBook as BookData, status);
                                                await loadUserBooks();
                                                setSelectedBook(null);
                                                setSearchResults([]);
                                            }}
                                            className="px-4 py-2 rounded border bg-white text-black border-black hover:bg-gray-100"
                                        >
                                            {getStatusIcon(status)} {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {loadingDetails ? (
                        <div className="text-center py-4 text-gray-500">Loading details...</div>
                    ) : bookDetails && (
                        <div className="space-y-4 mb-6">
                            {bookDetails.description && (
                                <div>
                                    <h3 className="font-semibold mb-2">Description</h3>
                                    <p className="text-gray-700 text-sm leading-relaxed">{bookDetails.description}</p>
                                </div>
                            )}

                            {bookDetails.subjects && bookDetails.subjects.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-2">Subjects</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {bookDetails.subjects.map((subject: string, idx: number) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-xs rounded">
                                                {subject}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bookDetails.publish_date && (
                                <div>
                                    <h3 className="font-semibold mb-2">First Published</h3>
                                    <p className="text-gray-700 text-sm">{bookDetails.publish_date}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Other users with this book:</h3>
                        {bookUsers.length > 0 ? (
                            <div className="space-y-2">
                                {bookUsers.map(user => (
                                    <div key={user.userFid} className="flex items-center gap-2 text-sm">
                                        <span>FID {user.userFid}</span>
                                        <span>{getStatusIcon(user.status)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No other users have logged this book yet.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Top Nav */}
            <div className="border-b border-black">
                <div className="flex items-center p-4 gap-4">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="text-2xl font-bold"
                    >
                        ☰
                    </button>

                    <div className="flex-1 flex items-center justify-center gap-2">
                        <span className="font-bold letter-spacing-wide">READ GOOD</span>
                        <span className="text-xl">📚</span>
                    </div>

                    <form onSubmit={handleSearch} className="w-64">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search books..."
                            className="w-full px-3 py-1 border border-black rounded"
                        />
                    </form>
                </div>
                {/* Dropdown Menu with Overlay */}
                {menuOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-20 z-40"
                            onClick={() => setMenuOpen(false)}
                        />
                        <div className="absolute top-0 left-0 w-64 bg-white border-r border-black h-screen z-50">
                            <div className="p-4">
                                <button
                                    onClick={() => setMenuOpen(false)}
                                    className="absolute top-4 right-4 text-2xl"
                                >
                                    ✕
                                </button>
                                <div className="mt-12 space-y-4">
                                    {['all', 'completed', 'current', 'desired'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => {
                                                setFilter(f as any);
                                                setMenuOpen(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 ${filter === f ? 'font-bold' : ''
                                                }`}
                                        >
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="p-4 border-b border-black bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Search Results</h3>
                        <button
                            onClick={() => {
                                setSearchResults([]);
                                setSearchQuery("");
                            }}
                            className="text-sm px-3 py-1 border border-black rounded hover:bg-gray-100"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="space-y-3">
                        {searchResults.map((book, idx) => (
                            <div
                                key={idx}
                                className="flex gap-3 bg-white p-3 rounded border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleBookClick(book)}
                            >
                                {book.cover_i && (
                                    <img
                                        src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                                        alt={book.title}
                                        className="w-12 h-16 object-cover"
                                    />
                                )}
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{book.title}</p>
                                    {book.author_name && (
                                        <p className="text-xs text-gray-600">{book.author_name[0]}</p>
                                    )}
                                </div>
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    {(['desired', 'current', 'completed'] as BookStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={async () => {
                                                await handleAddBook(book, status);
                                                setSearchResults([]);
                                                setSearchQuery("");
                                            }}
                                            className="text-xl hover:scale-110 transition-transform"
                                            title={status}
                                        >
                                            {getStatusIcon(status)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Library */}
            <div className="p-4">
                <h2 className="text-xl font-bold mb-1 letter-spacing-wide">LIBRARY</h2>
                <p className="text-sm text-gray-600 mb-4">{getLibraryTagline()}</p>
                {filteredBooks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-2xl mb-2">:(</p>
                        <p>No books yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredBooks.map((book, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleBookClick(book)}
                                className="cursor-pointer relative group"
                            >
                                {book.coverId ? (
                                    <img
                                        src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                                        alt={book.bookTitle}
                                        className="w-full h-auto rounded shadow-md group-hover:shadow-xl transition-shadow"
                                    />
                                ) : (
                                    <div className="w-full aspect-[2/3] bg-gray-200 rounded flex items-center justify-center">
                                        <span className="text-4xl">📖</span>
                                    </div>
                                )}
                                <div className="absolute top-1 right-1 bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow">
                                    {getStatusIcon(book.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
