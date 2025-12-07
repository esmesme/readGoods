"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { searchBooks, BookData, getBookDetails } from "@/lib/openLibrary";
import {
    saveBookToFirestore,
    getUserBooks,
    updateBookStatus,
    getBookUsers,
    deleteUserBook,
    addCustomBook,
    searchCustomBooks,
    getCustomBookDetails,
    updateCustomBook,
    saveUserProfile,
    addReadingLog,
    getReadingLogs,
    searchUsers
} from "@/lib/firestoreUtils";

import { BookStatus, UserBook, ReadingLog } from "@/lib/types";
import { sdk } from "@farcaster/frame-sdk";
import { BookCheck, Clock, BookmarkPlus, Users, CircleUserRound, Trash2, X, Plus, Share, LineChart as LineChartIcon, BookOpen, Ban } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FarcasterUser {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
}

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
        <div className={`${baseClasses} ${colorClasses} `} role="alert">
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
// Custom icon component for "desired" status
const DesiredIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <img
        src="/desired-icon.png"
        alt="Desired"
        style={{ width: size * 2.2, height: size * 2.2 }}
        className={`object - contain ${className} `}
    />
);

// Custom icon component for "current" status
const ReadingIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <img
        src="/reading-icon.png"
        alt="Reading"
        style={{ width: size * 2.2, height: size * 2.2 }}
        className={`object-contain ${className}`}
    />
);

// Custom icon component for "completed" status
const CompletedIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <img
        src="/completed-icon.png"
        alt="Completed"
        style={{ width: size * 2.2, height: size * 2.2 }}
        className={`object-contain ${className}`}
    />
);

const AbandonedIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <Ban
        size={size * 2.2}
        className={className}
    />
);

const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string; bgColor: string; borderColor: string }> = {
    current: {
        icon: ReadingIcon,
        label: "Reading",
        color: "text-amber-400",
        bgColor: "bg-amber-900/30",
        borderColor: "border-amber-700"
    },
    completed: {
        icon: CompletedIcon,
        label: "Completed",
        color: "text-emerald-400",
        bgColor: "bg-emerald-900/30",
        borderColor: "border-emerald-700"
    },
    desired: {
        icon: DesiredIcon,
        label: "Want to Read",
        color: "text-blue-400",
        bgColor: "bg-blue-900/30",
        borderColor: "border-blue-700"
    },
    abandoned: {
        icon: AbandonedIcon,
        label: "Abandoned",
        color: "text-fuchsia-400",
        bgColor: "bg-fuchsia-900/30",
        borderColor: "border-fuchsia-700"
    },
    none: {
        icon: CircleUserRound,
        label: "None",
        color: "text-neutral-400",
        bgColor: "bg-neutral-800",
        borderColor: "border-neutral-700"
    }
};

const StatusBookSection = ({ status, books, onBookClick }: { status: string, books: any[], onBookClick: (book: any) => void }) => {
    if (books.length === 0) return null;

    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <div key={status} className="space-y-4 mb-8">
            <div className="flex items-center space-x-2 border-b border-neutral-800 pb-2">
                <Icon size={20} className={config.color} />
                <h3 className="text-xl font-semibold text-white capitalize">{config.label}</h3>
                <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full text-xs">{books.length}</span>
            </div>

            <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-hide">
                {books.map(book => (
                    <div
                        key={book.bookKey}
                        onClick={() => onBookClick(book)}
                        className="flex-shrink-0 w-32 cursor-pointer group"
                    >
                        <div className="relative aspect-[2/3] mb-2 overflow-hidden rounded-lg shadow-md group-hover:shadow-xl transition-all">
                            {book.coverUrl || book.coverId || book.cover_i ? (
                                <img src={book.coverUrl || `https://covers.openlibrary.org/b/id/${book.coverId || book.cover_i}-L.jpg`} alt={book.bookTitle || book.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                    <img src="/book-icon.png" className="w-8 h-8 object-contain opacity-50" />
                                </div>
                            )}

                        </div>
                        <p className="text-sm font-medium text-white truncate group-hover:text-neutral-300">{book.bookTitle || book.title || 'Untitled Book'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface MainAppProps {
    farcasterUser: any;
}

// --- Components ---

const shareToFarcaster = (text: string, embedUrl?: string) => {
    const appUrl = "https://read-goods.vercel.app"; // Fallback if no embedUrl
    // If embedUrl is provided, we still might want the text to contain a link, but usually embeds are separate.
    // The requirement says "share links to actually be embeds".
    // Warpcast compose format: text=...&embeds[]=...

    let url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;

    if (embedUrl) {
        url += `&embeds[]=${encodeURIComponent(embedUrl)}`;
    } else {
        // Fallback to appending appUrl to text if no specific embed
        // But logic above was appending it to text. Let's keep consistent behavior or improve?
        // If we have an embed, we probably don't need the link in the text as well, 
        // but let's keep the text clean and just attach the embed.
        // If NO embedUrl, we might defaults to appUrl as an embed? 
        // Original code: fullText = text + appUrl.
        url += `&embeds[]=${encodeURIComponent(appUrl)}`;
    }

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

const ReadingLogModal = ({ isOpen, onClose, onSubmit, bookTitle, isSaving }: any) => {
    const [page, setPage] = useState("");
    const [thoughts, setThoughts] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ page: parseInt(page), thoughts });
        setPage("");
        setThoughts("");
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-white mb-4">Log Pages</h3>
                <p className="text-neutral-400 mb-6 text-sm">
                    Recording progress for <span className="text-white font-medium">{bookTitle}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">
                            Current Page
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={page}
                            onChange={(e) => setPage(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. 125"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">
                            Thoughts (Optional)
                        </label>
                        <textarea
                            value={thoughts}
                            onChange={(e) => setThoughts(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                            placeholder="How's the book? What's the vibe?"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !page}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSaving ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            ) : null}
                            Save Log
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-neutral-900 border border-neutral-700 p-3 rounded shadow-xl text-sm">
                <p className="text-neutral-400 mb-1">{label}</p>
                <p className="text-blue-400 font-bold mb-1">Page {payload[0].value}</p>
                {payload[0].payload.thoughts && (
                    <p className="text-neutral-300 italic max-w-xs">"{payload[0].payload.thoughts}"</p>
                )}
            </div>
        );
    }
    return null;
};

const ReadingProgressGraph = ({ logs, bookTitle, coverUrl, isAbandoned }: { logs: ReadingLog[], bookTitle: string, coverUrl?: string, isAbandoned?: boolean }) => {
    if (!logs || logs.length < 2) {
        return (
            <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-800">
                <LineChartIcon size={48} className="mx-auto text-neutral-600 mb-4" />
                <h3 className="text-lg font-medium text-neutral-300 mb-2">Not Enough Data</h3>
                <p className="text-neutral-500 max-w-sm mx-auto">
                    Log your book progress at least twice to generate a reading graph.
                </p>
            </div>
        );
    }

    const data = logs.map(log => ({
        date: new Date(log.date.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        page: log.page,
        thoughts: log.thoughts
    }));

    // If abandoned, add a drop-off point
    if (isAbandoned) {
        data.push({
            date: 'Abandoned',
            page: 0,
            thoughts: 'Stopped reading'
        });
    }

    const handleShareGraph = () => {
        const lastLog = data[data.length - 1];
        const text = isAbandoned
            ? `I decided to stop reading ${bookTitle}. It just wasn't for me. 📉`
            : `I'm on page ${lastLog.page} of ${bookTitle}. Here's my progress! 📈`;

        const shareUrl = new URL("https://read-goods.vercel.app/share");
        shareUrl.searchParams.set("title", bookTitle);
        if (coverUrl) {
            shareUrl.searchParams.set("image", coverUrl);
        }

        shareToFarcaster(text, shareUrl.toString());
    };

    return (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <LineChartIcon size={20} className="mr-2 text-blue-400" />
                    Reading Progress
                </h3>
                <button
                    onClick={handleShareGraph}
                    className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                >
                    <Share size={14} className="mr-1.5" />
                    Share
                </button>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                            dataKey="date"
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 12 }}
                            tickLine={{ stroke: '#333' }}
                        />
                        <YAxis
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 12 }}
                            tickLine={{ stroke: '#333' }}
                            label={{ value: 'Page', angle: -90, position: 'insideLeft', fill: '#666' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="page"
                            stroke={isAbandoned ? "#e879f9" : "#3b82f6"} // Lilac if abandoned
                            strokeWidth={3}
                            dot={{ fill: isAbandoned ? "#e879f9" : "#3b82f6", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: isAbandoned ? "#f0abfc" : "#60a5fa" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const BookCard = ({ book, userStatus, friendData, onStatusChange, onBack, onLogProgress, currentUserFid, viewedUser, effectiveUser, setViewedUser, isVisiting }: any) => {
    const userStatusConfig = STATUS_CONFIG[userStatus] || STATUS_CONFIG.none;
    const friendsWithBook = friendData.filter((f: any) => f.status && f.status !== 'none').length;
    const [reviewText, setReviewText] = useState("");
    const [isReviewing, setIsReviewing] = useState(false);
    const [readingLogs, setReadingLogs] = useState<ReadingLog[]>([]);
    const [showGraph, setShowGraph] = useState(false);
    const [userReview, setUserReview] = useState("");
    const [hasLoadedLogs, setHasLoadedLogs] = useState(false);

    // Initialize review text from existing data
    useEffect(() => {
        // If visiting, show the visited user's review if it exists
        if (isVisiting) {
            // Find review in friendData which contains the viewed user's data
            const visitedUserData = friendData.find((f: any) => f.userFid === viewedUser?.fid);
            if (visitedUserData?.review) {
                setUserReview(visitedUserData.review);
            }
        } else {
            // Check if current user has a review in friendData
            const currentUserData = friendData.find((f: any) => f.userFid === currentUserFid);
            if (currentUserData?.review) {
                setUserReview(currentUserData.review);
                setReviewText(currentUserData.review);
            }
        }
    }, [friendData, currentUserFid, isVisiting, viewedUser]);


    // Fetch reading logs
    useEffect(() => {
        const fetchLogs = async () => {
            // If we already have logs passed in book (which we do for selectedBook in MainApp), use them
            if (book.logs && book.logs.length > 0) {
                setReadingLogs(book.logs);
                setHasLoadedLogs(true);
                return;
            }

            // Otherwise fetch if we are visiting and want to show graph
            if (isVisiting && book.key && (userStatus === 'completed' || userStatus === 'current')) {
                const logs = await getReadingLogs(viewedUser.fid, book.key);
                setReadingLogs(logs);
                setHasLoadedLogs(true);
            }
        };
        fetchLogs();
    }, [book.key, userStatus, isVisiting, viewedUser, book.logs]);

    const handleSaveReview = () => {
        onStatusChange('completed', reviewText);
        setUserReview(reviewText);
        setIsReviewing(false);
    };

    // Helper to get cover URL
    const getCoverUrl = (b: any) => {
        // Prioritize custom uploaded cover
        if (b.coverUrl) {
            return b.coverUrl;
        }
        // Fall back to Open Library cover
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
                        <div className="text-neutral-300 mb-6 text-sm leading-relaxed">
                            <p className="line-clamp-6 mb-4">{book.description}</p>
                        </div>
                    )}
                    {/* Actions - Only show if NOT visiting */}
                    {!isVisiting && (
                        <div className="flex flex-col gap-3 mb-6">
                            {Object.keys(STATUS_CONFIG).filter(k => k !== 'none').map((statusKey) => {
                                const config = STATUS_CONFIG[statusKey];
                                const Icon = config.icon;
                                const isSelected = userStatus === statusKey;
                                return (
                                    <button
                                        key={statusKey}
                                        onClick={() => onStatusChange(statusKey)}
                                        className={`w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl border transition-all ${isSelected
                                            ? `${config.bgColor} ${config.color} ${config.borderColor} shadow-sm ring-1 ring-white/10`
                                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span>{config.label}</span>
                                    </button>
                                );
                            })}

                            {userStatus && userStatus !== 'none' && (
                                <button
                                    onClick={() => onStatusChange('none')}
                                    className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl border border-red-900/30 bg-red-900/10 text-red-400 hover:bg-red-900/20 transition-all shadow-sm"
                                >
                                    <Trash2 size={18} />
                                    <span>Remove</span>
                                </button>
                            )}

                            <button
                                onClick={handleShare}
                                className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-all shadow-sm"
                            >
                                <Share size={18} />
                                <span>Share</span>
                            </button>
                        </div>
                    )}

                    {/* Reading Graph Logic */}
                    {(userStatus === 'completed' || userStatus === 'abandoned') && (
                        <div className="mb-6">
                            <button
                                onClick={() => setShowGraph(!showGraph)}
                                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <LineChartIcon size={18} />
                                <span className={userStatus === 'abandoned' ? 'text-fuchsia-400 hover:text-fuchsia-300' : ''}>
                                    {showGraph ? 'Hide Reading Graph' : 'View Reading Graph'}
                                </span>
                            </button>
                            {showGraph && (
                                <div className="mt-4 h-64 w-full">
                                    {readingLogs.length > 0 ? (
                                        <ReadingProgressGraph
                                            logs={readingLogs}
                                            bookTitle={book.title || book.bookTitle}
                                            coverUrl={book.coverUrl}
                                            isAbandoned={userStatus === 'abandoned'}
                                        />
                                    ) : (
                                        <p className="text-neutral-500 italic mt-4">
                                            {userStatus === 'abandoned'
                                                ? "No logs recorded before abandoning."
                                                : "No reading logs recorded yet."}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Log Progress - Only if Current and NOT visiting */}
                    {!isVisiting && userStatus === 'current' && (
                        <div className="mb-6 p-4 bg-neutral-800/50 rounded-lg border border-neutral-800">
                            <h4 className="text-white font-semibold mb-2 flex items-center">
                                <BookOpen size={18} className="mr-2 text-blue-400" />
                                Update Progress
                            </h4>
                            <button
                                onClick={() => onLogProgress(book)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                            >
                                Log Pages Read
                            </button>
                        </div>
                    )}

                    {/* User Review */}
                    {(userStatus === 'completed' || isVisiting) && (
                        <div className="mb-6">
                            <h4 className="text-white font-semibold mb-2">My Review</h4>
                            {isReviewing && !isVisiting ? ( // Only allow editing if not visiting
                                <div className="space-y-3">
                                    <textarea
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 outline-none"
                                        rows={4}
                                        placeholder="What did you think?"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsReviewing(false)}
                                            className="px-4 py-2 text-neutral-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveReview}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                        >
                                            Save Review
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="group relative">
                                    {userReview ? (
                                        <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-800 italic text-neutral-300">
                                            "{userReview}"
                                        </div>
                                    ) : (
                                        <p className="text-neutral-500 italic">No review written.</p>
                                    )}
                                    {!isVisiting && ( // Only allow editing if not visiting
                                        <button
                                            onClick={() => setIsReviewing(true)}
                                            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            {userReview ? 'Edit Review' : 'Write a Review'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}


                    {/* User Status Display */}
                    {/* This section is largely replaced by the new logic above */}
                    {/* Keeping the original structure for other statuses if needed, but review/graph/log pages are now handled */}

                </div>
            </div>

            {/* Footer and Friends Section */}
            <div className="mt-8 pt-6 border-t border-neutral-800">
                {/* Action Buttons - Only show if NOT visiting */}


                <h3 className="text-xs font-semibold text-neutral-300 mb-4 flex items-center">
                    <Users size={14} className="mr-2 text-neutral-400" />
                    Other Farcaster users who also have this book in their library: ({friendsWithBook} on Farcaster)
                </h3>

                {/* Friends List & Reviews */}
                <div className="flex flex-col gap-4">
                    {friendsWithBook > 0 ? (
                        friendData.filter((f: any) => f.status && f.status !== 'none').map((friend: any) => (
                            <div key={friend.userFid} className="bg-neutral-800/50 p-3 rounded-xl border border-neutral-800">
                                <div className="flex items-center space-x-3 mb-2">
                                    <button
                                        onClick={() => {
                                            setViewedUser({
                                                fid: friend.userFid,
                                                username: friend.username,
                                                displayName: friend.displayName,
                                                pfpUrl: friend.pfpUrl
                                            });
                                            onBack(); // Close current book card
                                        }}
                                        className="flex items-center space-x-3 hover:opacity-80 transition-opacity text-left group"
                                    >
                                        <div className="relative">
                                            {friend.pfpUrl ? (
                                                <img
                                                    src={friend.pfpUrl}
                                                    alt={friend.displayName || friend.username || 'User'}
                                                    className="w-8 h-8 rounded-full object-cover border border-neutral-600 group-hover:border-blue-400 transition-colors"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center border-2 border-neutral-700 group-hover:border-blue-400 transition-colors">
                                                    <CircleUserRound size={16} className="text-neutral-400" />
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 bg-neutral-900 rounded-full p-0.5">
                                                {(() => {
                                                    const config = STATUS_CONFIG[friend.status];
                                                    const Icon = config?.icon;
                                                    return Icon ? (
                                                        <div className={`rounded-full p-1 ${config.bgColor} ${config.color}`}>
                                                            <Icon size={10} />
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-neutral-200 group-hover:text-blue-400 transition-colors">
                                                {friend.displayName || friend.username || `FID: ${friend.userFid}`}
                                            </span>
                                            <span className="text-xs text-neutral-500 capitalize">
                                                {STATUS_CONFIG[friend.status]?.label || friend.status}
                                            </span>
                                        </div>
                                    </button>
                                </div>

                                {friend.review && (
                                    <div className="ml-11 mt-1 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                        <p className="text-sm text-neutral-300 italic">"{friend.review}"</p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-neutral-500 italic">No friends have this book in their library yet.</p>
                    )}
                </div>
            </div>
        </div >
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
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const mobileDropdownRef = useRef<HTMLDivElement>(null);
    const [userBooks, setUserBooks] = useState<UserBook[]>([]);
    const [selectedBook, setSelectedBook] = useState<(BookData & { userStatus?: BookStatus }) | null>(null);
    const selectedBookKeyRef = useRef<string | null>(null);
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

    // Reading Log State
    const [isLoggingModalOpen, setIsLoggingModalOpen] = useState(false);
    const [loggingBook, setLoggingBook] = useState<UserBook | null>(null);
    const [readingLogs, setReadingLogs] = useState<ReadingLog[]>([]);
    const [showLogBookDropdown, setShowLogBookDropdown] = useState(false);

    // Fallback user for development/testing if not in Farcaster frame
    const effectiveUser = farcasterUser?.fid ? farcasterUser : { fid: 999999, username: 'dev_user' };
    const [viewedUser, setViewedUser] = useState<FarcasterUser | null>(null); // New state for viewed user
    const isVisiting = viewedUser?.fid !== effectiveUser?.fid && viewedUser?.fid !== undefined; // Determine if visiting another user's library

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
                const [olResults, customResults, userResults] = await Promise.all([
                    searchBooks(searchQuery),
                    searchCustomBooks(searchQuery),
                    searchUsers(searchQuery) // Search for users
                ]);

                // Merge results, putting custom books first or mixed? Let's put custom first for visibility
                // Add a 'type' property to distinguish between books and users
                const formattedUserResults = userResults.map(user => ({ ...user, type: 'user' }));
                const formattedBookResults = [...customResults, ...olResults].map(book => ({ ...book, type: 'book' }));

                setSearchResults([...formattedUserResults, ...formattedBookResults]);
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
            const target = event.target as Node;
            const outsideDesktop = (!dropdownRef.current || !dropdownRef.current.contains(target)) &&
                (!searchInputRef.current || !searchInputRef.current.contains(target));
            const outsideMobile = (!mobileDropdownRef.current || !mobileDropdownRef.current.contains(target)) &&
                (!mobileInputRef.current || !mobileInputRef.current.contains(target));

            if (outsideDesktop && outsideMobile) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Real-time listener for user's books
    useEffect(() => {
        const userToFetchFid = viewedUser?.fid || effectiveUser?.fid;
        if (!userToFetchFid) return;

        // Save user profile (only for the effective user, not viewed user)
        if (!viewedUser) { // Only save profile if we are viewing our own library
            saveUserProfile({
                fid: effectiveUser.fid,
                username: effectiveUser.username,
                displayName: effectiveUser.displayName,
                pfpUrl: effectiveUser.pfpUrl
            });
        }

        const q = query(
            collection(db, 'userBooks'),
            where('userFid', '==', userToFetchFid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const books = snapshot.docs.map(doc => doc.data() as UserBook);
            setUserBooks(books);

            // Update selected book status if it exists in the updated list
            const currentBookKey = selectedBookKeyRef.current;
            if (currentBookKey) {
                const updatedBook = books.find(b => b.bookKey === currentBookKey);
                if (updatedBook) {
                    // Update the selectedBook with the new status from Firestore
                    setSelectedBook(prev => {
                        if (!prev) return null;
                        return { ...prev, userStatus: updatedBook.status, logs: updatedBook.logs }; // Also update logs
                    });
                } else {
                    // If book was removed from library, clear status
                    setSelectedBook(prev => {
                        if (!prev) return null;
                        return { ...prev, userStatus: undefined };
                    });
                }
            }
        }, (error) => {
            console.error("Error listening to user books:", error);
        });

        return () => unsubscribe();
    }, [effectiveUser?.fid, viewedUser]); // Re-attach when user or viewed user changes

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

            // Add the book to the user's library with 'desired' status by default
            await saveBookToFirestore(
                {
                    key: newBookKey,
                    title: manualBookForm.title,
                    author_name: [manualBookForm.author],
                    first_publish_year: manualBookForm.year ? parseInt(manualBookForm.year) : undefined,
                },
                effectiveUser.fid,
                'desired' // Default status for manually added books
            );

            showToast("Book added to your library!", "success");
            setShowManualEntry(false);
            setManualBookForm({ title: '', author: '', year: '', description: '', genre: '' });

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
        const bookKey = 'bookKey' in book ? book.bookKey : book.key;

        // Update the ref to track the current selected book
        selectedBookKeyRef.current = bookKey;

        setSelectedBook({ ...book, userStatus } as any);
        setLoadingDetails(true);

        // Load details and users in parallel
        const [details, users] = await Promise.all([
            bookKey.startsWith('custom_') ? getCustomBookDetails(bookKey) : getBookDetails(bookKey),
            getBookUsers(bookKey)
        ]);

        setBookDetails(details);
        setBookUsers(users);
        setLoadingDetails(false);

        // Update selectedBook with fetched details (fixes missing title/cover for visiting books)
        if (details) {
            setSelectedBook(prev => prev ? ({ ...prev, ...details }) : null);
        }

        // Fetch reading logs if book is current or completed
        if (userStatus === 'current' || userStatus === 'completed') {
            if (effectiveUser?.fid) {
                const logs = await getReadingLogs(effectiveUser.fid, bookKey);
                setReadingLogs(logs);
            }
        } else {
            setReadingLogs([]);
        }
    };

    const handleLogProgress = (book: UserBook) => {
        setLoggingBook(book);
        setIsLoggingModalOpen(true);
        setShowLogBookDropdown(false);
    };

    const handleSaveLog = async (logData: { page: number; thoughts?: string }) => {
        if (!loggingBook || !effectiveUser?.fid) return;

        setIsSaving(true);
        try {
            await addReadingLog(effectiveUser.fid, loggingBook.bookKey, logData);
            showToast("Progress logged!", "success");
            setIsLoggingModalOpen(false);

            // Refresh logs if we are viewing this book
            if (selectedBook && (selectedBook.key === loggingBook.bookKey || (selectedBook as any).bookKey === loggingBook.bookKey)) {
                const logs = await getReadingLogs(effectiveUser.fid, loggingBook.bookKey);
                setReadingLogs(logs);
            }
        } catch (error) {
            console.error("Error saving log:", error);
            showToast("Failed to save log", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleHomeLogClick = () => {
        const currentBooks = userBooks.filter(b => b.status === 'current');
        if (currentBooks.length === 0) {
            showToast("No books currently reading", "default");
        } else if (currentBooks.length === 1) {
            handleLogProgress(currentBooks[0]);
        } else {
            setShowLogBookDropdown(!showLogBookDropdown);
        }
    };

    const handleStatusChange = async (newStatus: BookStatus | 'none', review?: string) => {
        if (!effectiveUser?.fid) {
            showToast("Please sign in", "error");
            return;
        }

        if (!selectedBook) return;

        // Get the book key (UserBook has 'bookKey', BookData has 'key')
        const bookKey = ('bookKey' in selectedBook ? selectedBook.bookKey : selectedBook.key) as string;

        // Optimistic update
        const updatedBook = { ...selectedBook, userStatus: newStatus !== 'none' ? newStatus : undefined };
        setSelectedBook(updatedBook as any);

        setIsSaving(true);
        try {
            if (newStatus === 'none') {
                await deleteUserBook(effectiveUser.fid, bookKey);
                showToast("Removed from library", "success");
                setSelectedBook(null); // Redirect to library
                selectedBookKeyRef.current = null;
            } else {
                // Create a proper BookData object for saveBookToFirestore
                const bookDataToSave: BookData = {
                    key: bookKey,
                    title: (selectedBook.title || ('bookTitle' in selectedBook ? (selectedBook as any).bookTitle : '')) as string,
                    author_name: (selectedBook.author_name || ('bookAuthors' in selectedBook ? (selectedBook as any).bookAuthors : undefined)) as string[] | undefined,
                    cover_i: (selectedBook.cover_i || ('coverId' in selectedBook ? (selectedBook as any).coverId : undefined)) as number | undefined,
                    first_publish_year: selectedBook.first_publish_year as number | undefined,
                    coverUrl: selectedBook.coverUrl as string | undefined
                };

                // Remove undefined fields (Firestore doesn't accept undefined)
                Object.keys(bookDataToSave).forEach(key => {
                    if ((bookDataToSave as any)[key] === undefined) {
                        delete (bookDataToSave as any)[key];
                    }
                });

                await saveBookToFirestore(bookDataToSave, effectiveUser.fid, newStatus, review);
                showToast(`Updated status to ${STATUS_CONFIG[newStatus].label}`, "success");
                if (review) {
                    showToast("Review saved!", "success");
                }
            }
        } catch (error) {
            console.error("Error updating status:", error);
            showToast("Failed to update status", "error");
            // Revert optimistic update on error
            setSelectedBook(selectedBook);
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
            <div className="min-h-screen bg-[#0a0a0a] p-4">
                <BookCard
                    book={{ ...selectedBook, ...bookDetails, logs: readingLogs }}
                    userStatus={selectedBook.userStatus}
                    friendData={bookUsers}
                    onStatusChange={handleStatusChange}
                    onBack={() => {
                        setSelectedBook(null);
                        setBookDetails(null);
                        setReadingLogs([]);
                        selectedBookKeyRef.current = null;
                    }}
                    isSaving={isSaving}
                    onLogProgress={handleLogProgress}
                    currentUserFid={effectiveUser?.fid}
                    isVisiting={!!viewedUser && viewedUser.fid !== effectiveUser?.fid}
                    viewedUser={viewedUser}
                    setViewedUser={setViewedUser}
                />

                <ReadingLogModal
                    isOpen={isLoggingModalOpen}
                    onClose={() => setIsLoggingModalOpen(false)}
                    onSubmit={handleSaveLog}
                    bookTitle={loggingBook?.bookTitle || "Book"}
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
                        <img src="/readgoods-logo.png" alt="readgoods" className="h-8 object-contain" />
                        <img src="/book-icon.png" alt="Book Icon" className="w-16 h-16 object-contain" />
                    </div>

                    {/* Desktop Search with Dropdown */}
                    <div className="w-64 hidden md:block relative">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.trim().length > 0 && setShowDropdown(true)}
                            placeholder="Search books..."
                            className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-neutral-600 focus:border-transparent outline-none transition-all"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-2.5">
                                <div className="animate-spin h-5 w-5 border-2 border-neutral-600 border-t-neutral-300 rounded-full"></div>
                            </div>
                        )}

                        {/* Dropdown Results */}
                        {showDropdown && searchQuery.trim().length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="absolute top-full mt-2 w-96 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50"
                            >
                                {/* Manual Entry Banner */}
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); setShowManualEntry(true); }}
                                    className="w-full p-4 bg-neutral-800/80 hover:bg-neutral-800 text-blue-400 text-sm font-medium text-center border-b border-neutral-700 transition-colors sticky top-0 backdrop-blur-sm z-10"
                                >
                                    Can't find what you're looking for? Click here to add a book to our database.
                                </button>

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
                                {searchResults.length === 0 && !isSearching && (
                                    <div className="p-4 text-center text-neutral-500 text-sm">
                                        No books found from open library.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Search with Dropdown */}
                <div className="md:hidden px-4 pb-4 relative">
                    <input
                        ref={mobileInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.trim().length > 0 && setShowDropdown(true)}
                        placeholder="Search books..."
                        className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-neutral-600 focus:border-transparent outline-none transition-all"
                    />
                    {isSearching && (
                        <div className="absolute right-7 top-6">
                            <div className="animate-spin h-5 w-5 border-2 border-neutral-600 border-t-neutral-300 rounded-full"></div>
                        </div>
                    )}

                    {/* Mobile Dropdown Results */}
                    {showDropdown && searchQuery.trim().length > 0 && (
                        <div
                            ref={mobileDropdownRef}
                            className="absolute top-full left-4 right-4 mt-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50"
                        >
                            {/* Manual Entry Banner */}
                            <button
                                onMouseDown={(e) => { e.preventDefault(); setShowManualEntry(true); }}
                                className="w-full p-4 bg-neutral-800/80 hover:bg-neutral-800 text-blue-400 text-sm font-medium text-center border-b border-neutral-700 transition-colors sticky top-0 backdrop-blur-sm z-10"
                            >
                                Can't find what you're looking for? Click here to add a book to our database.
                            </button>

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
                            {searchResults.length === 0 && !isSearching && (
                                <div className="p-4 text-center text-neutral-500 text-sm">
                                    No books found from open library.
                                </div>
                            )}
                        </div>
                    )}
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


                {/* Content: Visiting vs My Library */}
                {viewedUser && viewedUser.fid !== effectiveUser?.fid ? (
                    // --- VISITING VIEW ---
                    <div className="space-y-12">
                        <div className="flex flex-col items-start gap-6 mb-8">
                            <button
                                onClick={() => setViewedUser(effectiveUser)}
                                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-neutral-700 transition-colors flex items-center gap-2"
                            >
                                <span>←</span>
                                <span>Back to My Library</span>
                            </button>

                            <div className="flex items-center space-x-4">
                                {viewedUser.pfpUrl ? (
                                    <img src={viewedUser.pfpUrl} alt={viewedUser.username} className="w-16 h-16 rounded-full border-2 border-neutral-700" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border-2 border-neutral-700">
                                        <CircleUserRound size={32} className="text-neutral-500" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{viewedUser.displayName || viewedUser.username}'s Library</h2>
                                    <p className="text-neutral-400">Viewing user {viewedUser.username}</p>
                                </div>
                            </div>
                        </div>

                        {/* Sections */}
                        {['current', 'completed', 'desired', 'abandoned'].map((status) => (
                            <StatusBookSection
                                key={status}
                                status={status}
                                books={userBooks.filter(b => b.status === status)}
                                onBookClick={handleBookClick}
                            />
                        ))}

                        {userBooks.length === 0 && (
                            <div className="text-center py-20 text-neutral-500">
                                This user hasn't added any books yet.
                            </div>
                        )}
                    </div>
                ) : (
                    // --- MY LIBRARY VIEW (Existing) ---
                    <div>
                        {/* Log Pages Button */}
                        <div className="relative mb-12">
                            <button
                                onClick={handleHomeLogClick}
                                className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-2 rounded-lg transition-colors border border-neutral-700"
                            >
                                <BookOpen size={16} />
                                <span className="text-sm font-medium">Log Pages</span>
                            </button>

                            {showLogBookDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 py-1">
                                    {userBooks.filter(b => b.status === 'current').map(book => (
                                        <button
                                            key={book.bookKey}
                                            onClick={() => handleLogProgress(book)}
                                            className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors truncate"
                                        >
                                            {book.bookTitle}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Your Library</h2>
                                <p className="text-neutral-400 mt-1">{getLibraryTagline()}</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'all'
                                    ? 'bg-white text-neutral-900'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                                    }`}
                            >
                                All
                            </button>
                            {Object.keys(STATUS_CONFIG).filter(k => k !== 'none').map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setFilter(key as BookStatus)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${filter === key
                                        ? `${STATUS_CONFIG[key].bgColor} ${STATUS_CONFIG[key].color} ring-1 ring-inset ${STATUS_CONFIG[key].borderColor}`
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                                        }`}
                                >
                                    <span>{STATUS_CONFIG[key].label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Book List */}
                        {filteredBooks.length > 0 ? (
                            filter === 'all' ? (
                                // New Dashboard Layout for "All"
                                <div>
                                    {['current', 'completed', 'desired', 'abandoned'].map((status) => (
                                        <StatusBookSection
                                            key={status}
                                            status={status}
                                            books={userBooks.filter(b => b.status === status)}
                                            onBookClick={handleBookClick}
                                        />
                                    ))}
                                </div>
                            ) : (
                                // Grid Layout for Specific Filters
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
                                                {book.status && (book.status as string) !== 'none' && (
                                                    <div className={`absolute top-2 right-2 p-1.5 rounded-full ${STATUS_CONFIG[book.status]?.bgColor || 'bg-neutral-800'} border ${STATUS_CONFIG[book.status]?.borderColor || 'border-neutral-700'} shadow-sm backdrop-blur-sm`}>
                                                        {(() => {
                                                            const Icon = STATUS_CONFIG[book.status]?.icon;
                                                            return Icon ? <Icon size={14} className={STATUS_CONFIG[book.status]?.color || 'text-white'} /> : null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-semibold text-white leading-tight mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">{book.bookTitle}</h3>
                                            <p className="text-xs text-neutral-500 truncate">{Array.isArray(book.bookAuthors) ? book.bookAuthors[0] : book.bookAuthors}</p>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="text-center py-20 text-neutral-500">
                                {searchQuery ? 'No books found matching your search.' : 'Your library is empty. Start adding books above!'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Manual Entry Modal */}
            {showManualEntry && (
                <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto py-4">
                    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 w-full max-w-md shadow-2xl relative my-auto">
                        <button
                            onClick={() => setShowManualEntry(false)}
                            className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6">Add Manual Entry</h3>

                        <form onSubmit={handleManualBookSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">
                                    Book Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={manualBookForm.title}
                                    onChange={(e) => setManualBookForm({ ...manualBookForm, title: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter book title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">
                                    Author *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={manualBookForm.author}
                                    onChange={(e) => setManualBookForm({ ...manualBookForm, author: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter author name"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                                        Year (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        value={manualBookForm.year}
                                        onChange={(e) => setManualBookForm({ ...manualBookForm, year: e.target.value })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="YYYY"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                                        Genre (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={manualBookForm.genre}
                                        onChange={(e) => setManualBookForm({ ...manualBookForm, genre: e.target.value })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Fiction, Sci-Fi..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={manualBookForm.description}
                                    onChange={(e) => setManualBookForm({ ...manualBookForm, description: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                                    placeholder="Brief description of the book..."
                                />
                            </div>



                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold text-lg transition-all transform active:scale-[0.98] mt-4 flex justify-center items-center"
                            >
                                {isSaving ? (
                                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Add Book"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ReadingLogModal
                isOpen={isLoggingModalOpen}
                onClose={() => setIsLoggingModalOpen(false)}
                onSubmit={handleSaveLog}
                bookTitle={loggingBook?.bookTitle || "Book"}
                isSaving={isSaving}
            />

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: '' })}
            />
        </div>
    );
}

