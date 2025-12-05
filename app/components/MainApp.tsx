"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { searchBooks, BookData, getBookDetails } from "@/lib/openLibrary";
import { saveBookToFirestore, getUserBooks, updateBookStatus, getBookUsers, deleteUserBook, addCustomBook, searchCustomBooks, getCustomBookDetails, updateCustomBook } from "@/lib/firestoreUtils";
import { BookStatus, UserBook } from "@/lib/types";
import { sdk } from "@farcaster/frame-sdk";
import { BookCheck, Clock, BookmarkPlus, Users, CircleUserRound, Trash2, X, Plus, Share } from 'lucide-react';

// ... (imports remain the same)

const Toast = ({ message, type, onClose }: any) => {
    const baseClasses = "fixed bottom-5 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-2xl transition-opacity duration-300 flex items-center space-x-3 z-[60]";
    let colorClasses = '';

    if (!message) return null;

    switch (type) {
        case 'success':
            colorClasses = 'bg-green-900/90 text-white border border-green-800';
            break;
        case 'error':
            colorClasses = 'bg-red-900/90 text-white border border-red-800';
            break;
        default:
            colorClasses = 'bg-neutral-800 text-white border border-neutral-700';
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
    completed: { icon: BookCheck, color: 'text-green-400', bgColor: 'bg-green-900/30', label: 'Completed' },
    current: { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', label: 'Current' },
    desired: { icon: BookmarkPlus, color: 'text-blue-400', bgColor: 'bg-blue-900/30', label: 'Desired' },
    none: { icon: null, color: 'text-neutral-400', bgColor: 'bg-neutral-800', label: 'Add to Library' },
};

interface MainAppProps {
    farcasterUser: any;
}

// --- Components ---

const shareToFarcaster = (text: string) => {
    const appUrl = "https://read-goods.vercel.app"; // Placeholder URL
    const fullText = `${text}\n\n${appUrl}`;
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(fullText)}`;
    try {
        sdk.actions.openUrl(url);
    } catch (e) {
        window.open(url, '_blank');
    }
};

const StatusIcon = ({ status, size = 20, isButton = false, onClick = () => { }, className = "" }: any) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;
    const IconComponent = config.icon;
    const classes = `p-2 rounded-lg transition-all duration-200 ${config.color} ${config.bgColor} ${className}`;

    if (!IconComponent) return null;

    return (
        <button
            onClick={onClick}
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

    const handleShare = () => {
        const title = book.title || book.bookTitle;
        let text = `Check out ${title} on readgoods!`;
        if (userStatus === 'current') {
            text = `I just started reading ${title} today!`;
        } else if (userStatus === 'completed') {
            text = `I just finished reading ${title}`;
        } else if (userStatus === 'desired') {
            text = `I just put ${title} on my reading list. Any wanna do a book club?`;
        }
        shareToFarcaster(text);
    };

    return (
        <div className="bg-neutral-900 p-6 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-4xl mx-auto mt-4">
            <button
                onClick={onBack}
                className="mb-6 text-neutral-400 hover:text-white flex items-center gap-2 transition-colors"
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
                            className="w-32 h-48 md:w-48 md:h-72 object-cover rounded-lg shadow-lg border border-neutral-800"
                        />
                    ) : (
                        <div className="w-32 h-48 md:w-48 md:h-72 bg-neutral-800 rounded-lg shadow-lg flex items-center justify-center border border-neutral-700">
                            <img src="/book-icon.png" alt="No Cover" className="w-16 h-16 object-contain opacity-50" />
                        </div>
                    )}
                    <FriendsStatusOverlay friends={friendData} />
                </div>

                {/* Book Details */}
                <div className="flex-grow">
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                        {book.title || book.bookTitle}
                    </h2>
                    {(book.author_name || book.bookAuthors) && (
                        <p className="text-lg text-neutral-400 font-medium mb-4">
                            by {Array.isArray(book.author_name) ? book.author_name.join(", ") : book.bookAuthors}
                        </p>
                    )}

                    {book.description && (
                        <p className="text-neutral-300 mb-6 line-clamp-6 text-sm leading-relaxed">
                            {typeof book.description === 'string' ? book.description : book.description.value}
                        </p>
                    )}

                    {/* User Status Display */}
                    {userStatus && userStatus !== 'none' && (
                        <div className={`flex items-center space-x-2 p-3 rounded-xl border-l-4 ${userStatusConfig.color} ${userStatusConfig.bgColor} border-${userStatusConfig.color.split('-')[1]}-500 shadow-sm mb-6`}>
                            <CircleUserRound size={24} className={userStatusConfig.color} />
                            <span className="font-semibold text-neutral-200">
                                Your Status: {userStatusConfig.label}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer and Friends Section */}
            <div className="mt-8 pt-6 border-t border-neutral-800">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-6 justify-center md:justify-start">
                    {Object.keys(STATUS_CONFIG).filter(s => s !== 'none').map((status) => (
                        <StatusIcon
                            key={status}
                            status={status}
                            size={24}
                            isButton={true}
                            onClick={() => onStatusChange(status)}
                            className={userStatus === status ? 'ring-2 ring-neutral-500' : ''}
                        />
                    ))}
                    {userStatus && userStatus !== 'none' && (
                        <button
                            onClick={() => onStatusChange('none')}
                            className="flex items-center space-x-2 p-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-all duration-200"
                            title="Remove from your library"
                        >
                            <Trash2 size={24} />
                            <span className="font-semibold">Remove</span>
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="flex items-center space-x-2 p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-all duration-200"
                        title="Share to Farcaster"
                    >
                        <Share size={24} />
                        <span className="font-semibold">Share</span>
                    </button>
                </div>

                <h3 className="text-xl font-semibold text-neutral-300 mb-4 flex items-center">
                    <Users size={20} className="mr-2 text-neutral-400" />
                    Friends' Library Status ({friendsWithBook} on Farcaster)
                </h3>

                {/* Friends List */}
                <div className="flex flex-wrap gap-3">
                    {friendsWithBook > 0 ? (
                        friendData.filter((f: any) => f.status && f.status !== 'none').slice(0, 5).map((friend: any) => (
                            <span key={friend.userFid} className="inline-flex items-center text-sm font-medium bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-full border border-neutral-700">
                                <StatusIcon status={friend.status} size={14} />
                                <span className="ml-1.5">FID: {friend.userFid}</span>
                            </span>
                        ))
                    ) : (
                        <p className="text-neutral-500 italic">No friends have this book in their library yet.</p>
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
            className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl shadow-md border border-neutral-800 w-full max-w-4xl mx-auto mb-4 cursor-pointer hover:shadow-lg transition-shadow"
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
                        <div className="w-12 h-18 bg-neutral-800 rounded-md flex items-center justify-center">
                            <img src="/book-icon.png" alt="No Cover" className="w-8 h-8 object-contain opacity-50" />
                        </div>
                    )}
                </div>
                <div>
                    <p className="font-semibold text-white line-clamp-1">{book.title}</p>
                    {book.author_name && (
                        <p className="text-sm text-neutral-400 line-clamp-1">{book.author_name[0]}</p>
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
    const [showDropdown, setShowDropdown] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [userBooks, setUserBooks] = useState<UserBook[]>([]);
    const [selectedBook, setSelectedBook] = useState<(BookData & { userStatus?: BookStatus }) | null>(null);
    const [bookDetails, setBookDetails] = useState<any>(null);
    const [bookUsers, setBookUsers] = useState<{ userFid: number; status: BookStatus }[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Manual Book Entry State
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualBookForm, setManualBookForm] = useState({
        title: '',
        author: '',
        year: '',
        description: '',
        genre: ''
    });
    const [toast, setToast] = useState({ message: '', type: '' });

    // Fallback user for development/testing if not in Farcaster frame
    const effectiveUser = farcasterUser?.fid ? farcasterUser : { fid: 999999, username: 'dev_user' };

    const showToast = (message: string, type: 'success' | 'error' | 'default' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
    };

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Search both Open Library and Custom Books in parallel
                const [olResults, customResults] = await Promise.all([
                    searchBooks(searchQuery),
                    searchCustomBooks(searchQuery)
                ]);

                // Merge results, putting custom books first or mixed? Let's put custom first for visibility
                setSearchResults([...customResults, ...olResults]);
                setShowDropdown(true);
            } catch (error) {
                console.error("Search error:", error);
                showToast("Search failed", "error");
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const handleSearchResultClick = (book: BookData) => {
        handleBookClick(book);
        setShowDropdown(false);
        setSearchQuery("");
        setSearchResults([]);
    };
    const handleManualBookSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualBookForm.title.trim() || !manualBookForm.author.trim()) {
            showToast("Title and Author are required", "error");
            return;
        }

        if (!effectiveUser?.fid) {
            showToast("Please sign in to add books", "error");
            return;
        }

        setIsSaving(true);
        try {
            const newBookKey = await addCustomBook({
                title: manualBookForm.title,
                author_name: [manualBookForm.author],
                first_publish_year: manualBookForm.year ? parseInt(manualBookForm.year) : undefined,
                description: manualBookForm.description,
                subjects: manualBookForm.genre.split(',').map(s => s.trim()).filter(Boolean),
                createdBy: effectiveUser.fid
            });

            showToast("Book added successfully!", "success");
            setShowManualEntry(false);
            setManualBookForm({ title: '', author: '', year: '', description: '', genre: '' });

            // Optionally select the new book immediately
            // handleBookClick({ ... }) 
        } catch (error) {
            console.error("Error adding manual book:", error);
            showToast("Failed to add book", "error");
        } finally {
            setIsSaving(false);
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
            bookKey.startsWith('custom_') ? getCustomBookDetails(bookKey) : getBookDetails(bookKey),
            getBookUsers(bookKey)
        ]);

        setBookDetails(details);
        setBookUsers(users);
        setLoadingDetails(false);
    };

    const handleStatusChange = async (newStatus: BookStatus | 'none') => {
        if (!effectiveUser?.fid) {
            showToast("Please sign in", "error");
            return;
        }

        if (!selectedBook) return;

        const bookKey = ('bookKey' in selectedBook ? selectedBook.bookKey : selectedBook.key) as string;

        setIsSaving(true);

        try {
            // Check if this book is already in the user's library
            const existingBook = userBooks.find(b => b.bookKey === bookKey);

            if (newStatus === 'none') {
                // Remove from library
                await deleteUserBook(effectiveUser.fid, bookKey);
                showToast("Book removed from library", "default");
                setSelectedBook(null); // Redirect to library
            } else {
                if (existingBook) {
                    // Update existing book status
                    await updateBookStatus(effectiveUser.fid, bookKey, newStatus);
                    showToast(`Status updated to ${STATUS_CONFIG[newStatus].label}`, "success");
                } else {
                    // Add new book to library
                    // Handle both BookData and UserBook property names
                    const title = (selectedBook as any).title || (selectedBook as any).bookTitle || 'Unknown Title';
                    const authors = (selectedBook as any).author_name || (selectedBook as any).bookAuthors || ['Unknown Author'];
                    const coverId = (selectedBook as any).cover_i || (selectedBook as any).coverId;

                    const bookData: BookData = {
                        key: bookKey,
                        title: title,
                        author_name: Array.isArray(authors) ? authors : [authors],
                        cover_i: coverId,
                        first_publish_year: (selectedBook as any).first_publish_year
                    };
                    await saveBookToFirestore(bookData, effectiveUser.fid, newStatus);
                    showToast(`Added "${title}" to library!`, "success");
                }
                setSelectedBook(null); // Redirect to library
            }
        } catch (error) {
            console.error("Error updating status:", error);
            showToast("Failed to update status", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredBooks = filter === 'all'
        ? userBooks
        : userBooks.filter(book => book.status === filter);

    const getLibraryTagline = () => {
        switch (filter) {
            case 'current': return "Books currently being read";
            case 'completed': return "Books finished";
            case 'desired': return "Books to read";
            default: return "All books in library";
        }
    };

    const getEmptyStateMessage = () => {
        const username = effectiveUser?.displayName || "User";
        switch (filter) {
            case 'current':
                return `${username} is not currently reading a book`;
            case 'completed':
                return `${username} has not marked any books as completed`;
            case 'desired':
                return `${username} has no books on their reading list`;
            default:
                return "Your library is empty";
        }
    };

    if (selectedBook) {
        return (
            <div className="min-h-screen bg-gray-900 p-4">
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
        <div className="min-h-screen bg-[#0a0a0a] font-sans">
            {/* Top Nav */}
            <div className="bg-[#0a0a0a] border-b border-neutral-800 shadow-sm sticky top-0 z-30">
                <div className="flex items-center p-4 gap-4 max-w-6xl mx-auto">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="text-white hover:bg-neutral-800 p-2 rounded-lg transition-colors"
                    >
                        <div className="space-y-1.5">
                            <span className="block w-6 h-0.5 bg-current"></span>
                            <span className="block w-6 h-0.5 bg-current"></span>
                            <span className="block w-6 h-0.5 bg-current"></span>
                        </div>
                    </button>

                    <div className="flex-1 flex items-center justify-start gap-2">
                        <span className="font-extrabold text-xl tracking-tight text-white">readgoods</span>
                        <img src="/book-icon.png" alt="Book Icon" className="w-16 h-16 object-contain" />
                    </div>

                    {/* Desktop Search with Dropdown */}
                    <div className="w-64 hidden md:block relative">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            placeholder="Search books..."
                            className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-neutral-600 focus:border-transparent outline-none transition-all"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-2.5">
                                <div className="animate-spin h-5 w-5 border-2 border-neutral-600 border-t-neutral-300 rounded-full"></div>
                            </div>
                        )}

                        {/* Dropdown Results */}
                        {showDropdown && searchResults.length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="absolute top-full mt-2 w-96 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50"
                            >
                                {searchResults.map((book) => (
                                    <button
                                        key={book.key}
                                        onClick={() => handleSearchResultClick(book)}
                                        className="w-full p-3 hover:bg-neutral-800 flex gap-3 items-start text-left border-b border-neutral-800 last:border-b-0 transition-colors"
                                    >
                                        {book.cover_i && (
                                            <img
                                                src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                                                alt={book.title}
                                                className="w-12 h-16 object-cover rounded"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white truncate">{book.title}</div>
                                            {book.author_name && (
                                                <div className="text-sm text-neutral-400 truncate">
                                                    {book.author_name.join(", ")}
                                                </div>
                                            )}
                                            {book.first_publish_year && (
                                                <div className="text-xs text-neutral-500">{book.first_publish_year}</div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowManualEntry(true)}
                            className="absolute top-full mt-2 left-0 flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                            <div className="bg-neutral-900 p-1 rounded-full hover:bg-neutral-800 border border-neutral-800">
                                <Plus size={14} />
                            </div>
                            <span>Add book manually</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Search with Dropdown */}
                <div className="md:hidden px-4 pb-4 relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                        placeholder="Search books..."
                        className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-neutral-600 focus:border-transparent outline-none transition-all"
                    />
                    {isSearching && (
                        <div className="absolute right-7 top-6">
                            <div className="animate-spin h-5 w-5 border-2 border-neutral-600 border-t-neutral-300 rounded-full"></div>
                        </div>
                    )}

                    {/* Mobile Dropdown Results */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute top-full left-4 right-4 mt-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50">
                            {searchResults.map((book) => (
                                <button
                                    key={book.key}
                                    onClick={() => handleSearchResultClick(book)}
                                    className="w-full p-3 hover:bg-neutral-800 flex gap-3 items-start text-left border-b border-neutral-800 last:border-b-0 transition-colors"
                                >
                                    {book.cover_i && (
                                        <img
                                            src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                                            alt={book.title}
                                            className="w-12 h-16 object-cover rounded"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-white truncate">{book.title}</div>
                                        {book.author_name && (
                                            <div className="text-sm text-neutral-400 truncate">
                                                {book.author_name.join(", ")}
                                            </div>
                                        )}
                                        {book.first_publish_year && (
                                            <div className="text-xs text-neutral-500">{book.first_publish_year}</div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => setShowManualEntry(true)}
                        className="mt-2 flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                        <div className="bg-neutral-900 p-1 rounded-full hover:bg-neutral-800 border border-neutral-800">
                            <Plus size={14} />
                        </div>
                        <span>Add book manually</span>
                    </button>
                </div>


                {/* Dropdown Menu */}
                {/* Backdrop */}
                <div
                    className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${menuOpen ? 'bg-opacity-20' : 'bg-opacity-0 pointer-events-none'}`}
                    onClick={() => setMenuOpen(false)}
                />
                {/* Menu */}
                <div
                    className="fixed top-0 left-0 w-48 bg-[#0a0a0a] h-screen z-50 shadow-2xl transition-transform duration-300 ease-in-out border-r border-neutral-800"
                    style={{ transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)' }}
                >
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-lg text-white">Menu</h2>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className="text-neutral-400 hover:text-white p-1"
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
                                        ? 'bg-neutral-800 text-white font-semibold'
                                        : 'text-neutral-400 hover:bg-neutral-800'
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


                {/* Library */}
                <div>
                    <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">LIBRARY</h2>
                            <p className="text-neutral-400 mt-1">{getLibraryTagline()}</p>
                        </div>
                        <button
                            onClick={() => shareToFarcaster("i just read X pages of my book today and it has me feeling....")}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium w-full md:w-auto"
                        >
                            <Share size={16} />
                            <span>Tell others what you read today</span>
                        </button>
                    </div>

                    {filteredBooks.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-900 rounded-xl border border-dashed border-neutral-800">
                            <div className="flex justify-center mb-4">
                                <img src="/book-icon.png" alt="Empty Library" className="w-32 h-32 object-contain opacity-80" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">{getEmptyStateMessage()}</h3>
                            <p className="text-neutral-400">Search for books to add them to your collection</p>
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
                                                src={`https://covers.openlibrary.org/b/id/${book.coverId}-L.jpg`}
                                                alt={book.bookTitle}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-600">
                                                <img src="/book-icon.png" alt="No Cover" className="w-12 h-12 object-contain opacity-50" />
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className="absolute top-2 right-2">
                                            <div className={`p-1.5 rounded-full bg-neutral-900/90 backdrop-blur-sm shadow-sm ${STATUS_CONFIG[book.status]?.color}`}>
                                                {(() => {
                                                    const Icon = STATUS_CONFIG[book.status]?.icon;
                                                    return Icon ? <Icon size={14} /> : null;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-neutral-300 transition-colors">{book.bookTitle}</h3>
                                    {book.bookAuthors && (
                                        <p className="text-sm text-neutral-400 line-clamp-1">
                                            {Array.isArray(book.bookAuthors) ? book.bookAuthors[0] : book.bookAuthors}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Entry Modal */}
            {showManualEntry && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-800">
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-white">Add Book Manually</h3>
                            <button
                                onClick={() => setShowManualEntry(false)}
                                className="text-neutral-400 hover:text-white p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleManualBookSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={manualBookForm.title}
                                    onChange={e => setManualBookForm({ ...manualBookForm, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-neutral-500 outline-none"
                                    placeholder="Book Title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">Author *</label>
                                <input
                                    type="text"
                                    required
                                    value={manualBookForm.author}
                                    onChange={e => setManualBookForm({ ...manualBookForm, author: e.target.value })}
                                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-neutral-500 outline-none"
                                    placeholder="Author Name"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">Year</label>
                                    <input
                                        type="number"
                                        value={manualBookForm.year}
                                        onChange={e => setManualBookForm({ ...manualBookForm, year: e.target.value })}
                                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-neutral-500 outline-none"
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
                                <textarea
                                    value={manualBookForm.description}
                                    onChange={e => setManualBookForm({ ...manualBookForm, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-neutral-500 outline-none h-24 resize-none"
                                    placeholder="Brief description..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">Genres (comma separated)</label>
                                <input
                                    type="text"
                                    value={manualBookForm.genre}
                                    onChange={e => setManualBookForm({ ...manualBookForm, genre: e.target.value })}
                                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-neutral-500 outline-none"
                                    placeholder="Fiction, Sci-Fi, etc."
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-2.5 bg-white text-neutral-900 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Adding Book...' : 'Add Book'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: '' })}
            />
        </div>
    );
}

