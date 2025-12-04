"use client";

import { useState, useEffect, useMemo } from "react";
import { searchBooks, BookData, getBookDetails } from "@/lib/openLibrary";
import { saveBookToFirestore, getUserBooks, updateBookStatus, getBookUsers } from "@/lib/firestoreUtils";
import { BookStatus, UserBook } from "@/lib/types";
import { BookCheck, Clock, BookmarkPlus, Users, CircleUserRound, Trash2, X } from 'lucide-react';

// ... (imports remain the same)

const Toast = ({ message, type, onClose }: any) => {
    const baseClasses = "fixed bottom-5 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-2xl transition-opacity duration-300 flex items-center space-x-3 z-[60]";
    let colorClasses = '';

    if (!message) return null;

    switch (type) {
        case 'success':
            colorClasses = 'bg-green-600 text-white';
            break;
        case 'error':
            colorClasses = 'bg-red-600 text-white';
            break;
        default:
            colorClasses = 'bg-gray-800 text-white';
    }

    return (
        <div className={`${baseClasses} ${colorClasses}`} role="alert">
            {type === 'success' && <BookCheck size={20} />}
            {type === 'error' && <X size={20} />}
            <span className="font-semibold">{message}</span>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
                <X size={16} />
            </button>
        </div>
    );
};

// --- Icon Mapping and Configuration ---
const STATUS_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
    completed: { icon: BookCheck, color: 'text-green-500', bgColor: 'bg-green-100', label: 'Completed' },
    current: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Current' },
    desired: { icon: BookmarkPlus, color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'Desired' },
    none: { icon: null, color: 'text-gray-400', bgColor: 'bg-gray-200', label: 'Add to Library' },
};

interface MainAppProps {
    farcasterUser: any;
}

// --- Components ---

const StatusIcon = ({ status, size = 20, isButton = false, onClick = () => { }, className = "" }: any) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;
    const IconComponent = config.icon;
    const classes = `p-2 rounded-lg transition-all duration-200 ${config.color} ${config.bgColor} ${className}`;

    if (!IconComponent) return null;

    const handleClick = () => {
        console.log("StatusIcon clicked:", status, "isButton:", isButton);
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            disabled={!isButton}
            className={`${classes} ${isButton ? 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : ''} flex items-center justify-center space-x-2`}
            title={config.label}
        >
            <IconComponent size={size} />
            {isButton && <span className="font-semibold">{config.label}</span>}
        </button>
    );
};

const FriendsStatusOverlay = ({ friends }: { friends: { userFid: number; status: BookStatus }[] }) => {
    const statuses = useMemo(() => {
        const activeStatuses = friends
            .map(f => f.status)
            .filter(status => status && status !== 'none' as any)
            .reduce((acc: string[], status) => {
                if (!acc.includes(status)) acc.push(status);
                return acc;
            }, []);

        return activeStatuses.slice(0, 3);
    }, [friends]);

    if (statuses.length === 0) return null;

    return (
        <div className="absolute top-0 right-0 z-10 flex -space-x-2">
            {statuses.map((status, index) => {
                const config = STATUS_CONFIG[status];
                if (!config) return null;
                const Icon = config.icon;
                return (
                    <div
                        key={index}
                        className={`relative w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center 
            ${config.color} ${config.bgColor}`}
                        title={`${config.label} by friends`}
                        style={{
                            zIndex: 10 - index,
                            transform: `translateX(${index * 5}px)`
                        }}
                    >
                        <Icon size={12} strokeWidth={3} />
                    </div>
                );
            })}
        </div>
    );
};

const BookCard = ({ book, userStatus, friendData, onStatusChange, onBack }: any) => {
    const userStatusConfig = STATUS_CONFIG[userStatus] || STATUS_CONFIG.none;
    const friendsWithBook = friendData.filter((f: any) => f.status && f.status !== 'none').length;

    // Helper to get cover URL
    const getCoverUrl = (b: any) => {
        const coverId = b.cover_i || b.coverId;
        return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
    };

    const coverUrl = getCoverUrl(book);

    return (
        <div className="bg-white p-6 rounded-xl shadow-2xl transition-all duration-300 hover:shadow-3xl w-full max-w-4xl mx-auto mt-4">
            <button
                onClick={onBack}
                className="mb-6 text-gray-600 hover:text-black flex items-center gap-2"
            >
                ← Back
            </button>

            <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
                {/* Book Cover */}
                <div className="relative flex-shrink-0 mx-auto md:mx-0">
                    {coverUrl ? (
                        <img
                            src={coverUrl}
                            alt={`${book.title || book.bookTitle} cover`}
                            className="w-32 h-48 md:w-48 md:h-72 object-cover rounded-lg shadow-lg"
                        />
                    ) : (
                        <div className="w-32 h-48 md:w-48 md:h-72 bg-gray-200 rounded-lg shadow-lg flex items-center justify-center">
                            <span className="text-4xl">📖</span>
                        </div>
                    )}
                    <FriendsStatusOverlay friends={friendData} />
                </div>

                {/* Book Details */}
                <div className="flex-grow">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight mb-2">
                        {book.title || book.bookTitle}
                    </h2>
                    {(book.author_name || book.bookAuthors) && (
                        <p className="text-lg text-gray-800 font-medium mb-4">
                            by {Array.isArray(book.author_name) ? book.author_name.join(", ") : book.bookAuthors}
                        </p>
                    )}

                    {book.description && (
                        <p className="text-gray-600 mb-6 line-clamp-6 text-sm leading-relaxed">
                            {typeof book.description === 'string' ? book.description : book.description.value}
                        </p>
                    )}

                    {/* User Status Display */}
                    {userStatus && userStatus !== 'none' && (
                        <div className={`flex items-center space-x-2 p-3 rounded-xl border-l-4 ${userStatusConfig.color} ${userStatusConfig.bgColor} border-${userStatusConfig.color.split('-')[1]}-500 shadow-sm mb-6`}>
                            <CircleUserRound size={24} className={userStatusConfig.color} />
                            <span className="font-semibold text-gray-700">
                                Your Status: {userStatusConfig.label}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer and Friends Section */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-6 justify-center md:justify-start">
                    {Object.keys(STATUS_CONFIG).filter(s => s !== 'none').map((status) => (
                        <StatusIcon
                            key={status}
                            status={status}
                            size={24}
                            isButton={true}
                            onClick={() => {
                                console.log("BookCard status icon clicked:", status);
                                onStatusChange(status);
                            }}
                            className={userStatus === status ? 'ring-4 ring-gray-400' : ''}
                        />
                    ))}
                    {userStatus && userStatus !== 'none' && (
                        <button
                            onClick={() => onStatusChange('none')}
                            className="flex items-center space-x-2 p-2 rounded-lg bg-red-100 text-red-500 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                            title="Remove from your library"
                        >
                            <Trash2 size={24} />
                            <span className="font-semibold">Remove</span>
                        </button>
                    )}
                </div>

                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                    <Users size={20} className="mr-2 text-gray-700" />
                    Friends' Library Status ({friendsWithBook} on Farcaster)
                </h3>

                {/* Friends List */}
                <div className="flex flex-wrap gap-3">
                    {friendsWithBook > 0 ? (
                        friendData.filter((f: any) => f.status && f.status !== 'none').slice(0, 5).map((friend: any) => (
                            <span key={friend.userFid} className="inline-flex items-center text-sm font-medium bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200">
                                <StatusIcon status={friend.status} size={14} />
                                <span className="ml-1.5">FID: {friend.userFid}</span>
                            </span>
                        ))
                    ) : (
                        <p className="text-gray-500 italic">No friends have this book in their library yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const SearchResult = ({ book, onStatusChange, onClick }: any) => {
    const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg` : null;

    return (
        <div
            className="flex items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-200 w-full max-w-4xl mx-auto mb-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={onClick}
        >
            <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-shrink-0">
                    {coverUrl ? (
                        <img
                            src={coverUrl}
                            alt={`${book.title} cover`}
                            className="w-12 h-18 object-cover rounded-md"
                        />
                    ) : (
                        <div className="w-12 h-18 bg-gray-200 rounded-md flex items-center justify-center">
                            <span className="text-xl">📖</span>
                        </div>
                    )}
                </div>
                <div>
                    <p className="font-semibold text-gray-800 line-clamp-1">{book.title}</p>
                    {book.author_name && (
                        <p className="text-sm text-gray-500 line-clamp-1">{book.author_name[0]}</p>
                    )}
                </div>
            </div>

            <div className="flex space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                {Object.keys(STATUS_CONFIG).filter(s => s !== 'none').map((status) => {
                    const config = STATUS_CONFIG[status];
                    const Icon = config.icon;
                    return (
                        <button
                            key={status}
                            onClick={() => onStatusChange(status)}
                            className={`p-1.5 rounded-full transition-all duration-150 ${config.bgColor} ${config.color} hover:shadow-lg hover:scale-[1.1]`}
                            title={`Mark as ${config.label}`}
                        >
                            <Icon size={18} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";

// ... (imports remain the same)

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
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });

    // Fallback user for development/testing if not in Farcaster frame
    const effectiveUser = farcasterUser?.fid ? farcasterUser : { fid: 999999, username: 'dev_user' };

    const showToast = (message: string, type: 'success' | 'error' | 'default' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
    };

    // Real-time listener for user's books
    useEffect(() => {
        if (!effectiveUser?.fid) return;

        const q = query(
            collection(db, 'userBooks'),
            where('userFid', '==', effectiveUser.fid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const books = snapshot.docs.map(doc => doc.data() as UserBook);
            setUserBooks(books);

            // Update selected book status if it exists in the updated list
            if (selectedBook) {
                const bookKey = 'bookKey' in selectedBook ? selectedBook.bookKey : selectedBook.key;
                const updatedBook = books.find(b => b.bookKey === bookKey);
                if (updatedBook) {
                    setSelectedBook(prev => prev ? ({ ...prev, userStatus: updatedBook.status }) : null);
                } else if ('userStatus' in selectedBook) {
                    // If book was removed or status cleared, update local state
                    setSelectedBook(prev => prev ? ({ ...prev, userStatus: undefined }) : null);
                }
            }
        }, (error) => {
            console.error("Error listening to user books:", error);
        });

        return () => unsubscribe();
    }, [effectiveUser?.fid, selectedBook ? ('bookKey' in selectedBook ? selectedBook.bookKey : selectedBook.key) : null]); // Re-attach if user changes

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await searchBooks(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Search error:", error);
            showToast("Search failed", "error");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddBook = async (book: BookData, status: BookStatus) => {
        if (!effectiveUser?.fid) return;
        setIsSaving(true);
        try {
            await saveBookToFirestore(book, effectiveUser.fid, status);
            // No need to manually loadUserBooks, onSnapshot handles it
            setSearchResults([]);
            setSearchQuery("");
            showToast(`Added "${book.title}" to library!`, 'success');
        } catch (error) {
            console.error("Error adding book:", error);
            showToast("Failed to add book", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBookClick = async (book: UserBook | BookData) => {
        const userStatus = 'status' in book ? book.status : undefined;
        setSelectedBook({ ...book, userStatus } as any);
        setLoadingDetails(true);

        const bookKey = 'bookKey' in book ? book.bookKey : book.key;

        // Load details and users in parallel
        const [details, users] = await Promise.all([
            getBookDetails(bookKey),
            getBookUsers(bookKey)
        ]);

        setBookDetails(details);
        setBookUsers(users);
        setLoadingDetails(false);
    };

    const handleStatusChange = async (newStatus: BookStatus | 'none') => {
        console.log("handleStatusChange called with:", newStatus);

        if (!effectiveUser?.fid) {
            console.error("No user found");
            showToast("Please sign in", "error");
            return;
        }

        if (!selectedBook) {
            console.error("No selected book");
            return;
        }

        const bookKey = ('bookKey' in selectedBook ? selectedBook.bookKey : selectedBook.key) as string;
        console.log("Processing book:", bookKey);

        setIsSaving(true);

        try {
            // Check if this book is already in the user's library
            const existingBook = userBooks.find(b => b.bookKey === bookKey);
            console.log("Existing book found:", !!existingBook, "Total user books:", userBooks.length);

            if (newStatus === 'none') {
                // Remove from library
                await updateBookStatus(effectiveUser.fid, bookKey, 'desired');
                showToast("Book removed from library", "default");
                setSelectedBook(null); // Redirect to library
            } else {
                if (existingBook) {
                    // Update existing book status
                    console.log("Updating existing book status to:", newStatus);
                    await updateBookStatus(effectiveUser.fid, bookKey, newStatus);
                    console.log("Update successful, showing toast");
                    showToast(`Status updated to ${STATUS_CONFIG[newStatus].label}`, "success");
                } else {
                    // Add new book to library
                    console.log("Adding new book to library");
                    // Handle both BookData and UserBook property names
                    const title = (selectedBook as any).title || (selectedBook as any).bookTitle || 'Unknown Title';
                    const authors = (selectedBook as any).author_name || (selectedBook as any).bookAuthors || ['Unknown Author'];
                    const coverId = (selectedBook as any).cover_i || (selectedBook as any).coverId;
                    console.log("Book data:", { title, authors, coverId });

                    const bookData: BookData = {
                        key: bookKey,
                        title: title,
                        author_name: Array.isArray(authors) ? authors : [authors],
                        cover_i: coverId,
                        first_publish_year: (selectedBook as any).first_publish_year
                    };
                    console.log("Calling saveBookToFirestore with:", { fid: effectiveUser.fid, status: newStatus });
                    await saveBookToFirestore(bookData, effectiveUser.fid, newStatus);
                    console.log("Save successful, showing toast");
                    showToast(`Added "${title}" to library!`, "success");
                }
                setSelectedBook(null); // Redirect to library
            }
        } catch (error) {
            console.error("Error updating status:", error);
            console.error("Error details:", error);
            showToast("Failed to update status", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredBooks = filter === 'all'
        ? userBooks
        : userBooks.filter(book => book.status === filter);

    const getLibraryTagline = () => {
        const username = effectiveUser?.username || 'User';
        switch (filter) {
            case 'all': return `All of ${username}'s books`;
            case 'current': return `${username} is currently reading...`;
            case 'completed': return `${username}'s completed books`;
            case 'desired': return `${username} wants to read`;
        }
    };

    if (selectedBook) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <BookCard
                    book={{ ...selectedBook, ...bookDetails }}
                    userStatus={selectedBook.userStatus}
                    friendData={bookUsers}
                    onStatusChange={handleStatusChange}
                    onBack={() => {
                        setSelectedBook(null);
                        setBookDetails(null);
                    }}
                    isSaving={isSaving}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Top Nav */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
                <div className="flex items-center p-4 gap-4 max-w-6xl mx-auto">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    >
                        <div className="space-y-1.5">
                            <span className="block w-6 h-0.5 bg-current"></span>
                            <span className="block w-6 h-0.5 bg-current"></span>
                            <span className="block w-6 h-0.5 bg-current"></span>
                        </div>
                    </button>

                    <div className="flex-1 flex items-center justify-start gap-2">
                        <span className="font-extrabold text-xl tracking-tight text-gray-900">READ GOOD</span>
                        <span className="text-2xl">📚</span>
                    </div>

                    <form onSubmit={handleSearch} className="w-64 hidden md:block">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search books..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                        />
                    </form>
                </div>

                {/* Mobile Search */}
                <div className="md:hidden px-4 pb-4">
                    <form onSubmit={handleSearch}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search books..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                        />
                    </form>
                </div>


                {/* Dropdown Menu */}
                {/* Backdrop */}
                <div
                    className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${menuOpen ? 'bg-opacity-20' : 'bg-opacity-0 pointer-events-none'}`}
                    onClick={() => setMenuOpen(false)}
                />
                {/* Menu */}
                <div
                    className="fixed top-0 left-0 w-48 bg-white h-screen z-50 shadow-2xl transition-transform duration-300 ease-in-out"
                    style={{ transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)' }}
                >
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-lg text-gray-800">Menu</h2>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className="text-gray-500 hover:text-gray-800 p-1"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-1">
                            {['all', 'completed', 'current', 'desired'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => {
                                        setFilter(f as any);
                                        setMenuOpen(false);
                                    }}
                                    className={`block w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${filter === f
                                        ? 'bg-gray-100 text-gray-900 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-8">
                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-700 text-lg">Search Results</h3>
                            <button
                                onClick={() => {
                                    setSearchResults([]);
                                    setSearchQuery("");
                                }}
                                className="text-sm px-4 py-1.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear Results
                            </button>
                        </div>
                        <div className="space-y-3">
                            {searchResults.map((book, idx) => (
                                <SearchResult
                                    key={idx}
                                    book={book}
                                    onStatusChange={(status: BookStatus) => handleAddBook(book, status)}
                                    onClick={() => handleBookClick(book)}
                                    isSaving={isSaving}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Library */}
                <div>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">LIBRARY</h2>
                        <p className="text-gray-500 mt-1">{getLibraryTagline()}</p>
                    </div>

                    {filteredBooks.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <div className="text-6xl mb-4">📚</div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Your library is empty</h3>
                            <p className="text-gray-500">Search for books to add them to your collection</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {filteredBooks.map((book, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleBookClick(book)}
                                    className="cursor-pointer group relative flex flex-col"
                                >
                                    <div className="relative aspect-[2/3] mb-3 overflow-hidden rounded-lg shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                                        {book.coverId ? (
                                            <img
                                                src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                                                alt={book.bookTitle}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                <span className="text-4xl">📖</span>
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        <div className="absolute top-2 right-2">
                                            <div className={`p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm ${STATUS_CONFIG[book.status]?.color}`}>
                                                {(() => {
                                                    const Icon = STATUS_CONFIG[book.status]?.icon;
                                                    return Icon ? <Icon size={14} /> : null;
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 mb-1 group-hover:text-gray-900 transition-colors">
                                        {book.bookTitle}
                                    </h3>
                                    {book.bookAuthors && (
                                        <p className="text-xs text-gray-500 line-clamp-1">
                                            {Array.isArray(book.bookAuthors) ? book.bookAuthors[0] : book.bookAuthors}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Toast Render */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: '' })}
            />
        </div>
    );
}
