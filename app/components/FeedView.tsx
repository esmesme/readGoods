import React, { useEffect, useState } from 'react';
import { getGlobalReviews, getUserProfile, toggleLikeReview, checkReviewLikeStatus } from '../../lib/firestoreUtils';
import { Star, MessageCircle, User as UserIcon, Heart, Share } from 'lucide-react';
import { STATUS_CONFIG } from './MainApp';

interface FeedViewProps {
    onNavigateToUser: (fid: number) => void;
    onBookClick: (book: any) => void;
    currentUserFid?: number;
}

const ReviewCard = ({ review, user, statusConfig, onBookClick, onNavigateToUser, currentUserFid }: any) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(review.likeCount || 0);
    const [isLiking, setIsLiking] = useState(false);

    useEffect(() => {
        if (currentUserFid && review.id) {
            checkReviewLikeStatus(review.id, currentUserFid).then(setIsLiked);
        }
    }, [currentUserFid, review.id]);

    const handleLike = async () => {
        if (!currentUserFid || isLiking) return;

        // Optimistic update
        const newIsLiked = !isLiked;
        const newCount = likeCount + (newIsLiked ? 1 : -1);
        setIsLiked(newIsLiked);
        setLikeCount(newCount);
        setIsLiking(true);

        try {
            await toggleLikeReview(review.id, currentUserFid);
        } catch (error) {
            // Revert on error
            setIsLiked(!newIsLiked);
            setLikeCount(likeCount);
            console.error("Failed to toggle like:", error);
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = async () => {
        const shareText = `Check out ${user?.displayName || 'this user'}'s review of "${review.bookTitle}" on Book Logger!`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Book Review',
                    text: shareText,
                    url: window.location.href // Ideally deep link
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback
            navigator.clipboard.writeText(shareText + " " + window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm hover:border-neutral-700 transition-colors">
            <div className="flex items-start gap-4">
                {/* Book Cover */}
                <div
                    className="flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                    onClick={() => onBookClick({
                        key: review.bookKey,
                        title: review.bookTitle,
                        author_name: Array.isArray(review.bookAuthors) ? review.bookAuthors : [review.bookAuthors],
                        coverUrl: review.coverUrl,
                        cover_i: review.coverId
                    })}
                >
                    {review.coverUrl ? (
                        <img
                            src={review.coverUrl}
                            alt={review.bookTitle}
                            className="w-16 h-24 object-cover rounded shadow-md border border-neutral-800"
                        />
                    ) : (
                        <div className="w-16 h-24 bg-neutral-800 rounded flex items-center justify-center border border-neutral-700">
                            <span className="text-xs text-neutral-600">No Cover</span>
                        </div>
                    )}
                </div>

                <div className="flex-grow min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                        <button
                            onClick={() => onNavigateToUser(review.userFid)}
                            className="flex items-center gap-2 group"
                        >
                            {user?.pfpUrl ? (
                                <img src={user.pfpUrl} alt={user.username} className="w-6 h-6 rounded-full object-cover border border-neutral-700 group-hover:border-blue-400 transition-colors" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 group-hover:border-blue-400 transition-colors">
                                    <UserIcon size={12} className="text-neutral-500" />
                                </div>
                            )}
                            <span className="text-sm font-medium text-neutral-300 group-hover:text-blue-400 transition-colors truncate max-w-[150px]">
                                {user?.displayName || user?.username || `User ${review.userFid}`}
                            </span>
                        </button>
                        <span className="text-xs text-neutral-500">
                            {review.updatedAt?.seconds ? new Date(review.updatedAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                        </span>
                    </div>

                    {/* Title */}
                    <h3
                        onClick={() => onBookClick({
                            key: review.bookKey,
                            title: review.bookTitle,
                            author_name: Array.isArray(review.bookAuthors) ? review.bookAuthors : [review.bookAuthors],
                            coverUrl: review.coverUrl,
                            cover_i: review.coverId
                        })}
                        className="font-bold text-white text-lg leading-tight mb-1 line-clamp-1 cursor-pointer hover:text-blue-400 transition-colors"
                    >
                        {review.bookTitle}
                    </h3>
                    {review.bookAuthors && (
                        <p className="text-xs text-neutral-500 mb-3 line-clamp-1">
                            by {Array.isArray(review.bookAuthors) ? review.bookAuthors.join(", ") : review.bookAuthors}
                        </p>
                    )}

                    {/* Review Content */}
                    <div className="bg-neutral-800/50 rounded-lg p-3 text-sm text-neutral-300 italic mb-3 border border-neutral-800/50 relative">
                        "{review.review}"
                        {statusConfig && (
                            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center border border-neutral-700 shadow-sm ${statusConfig.bgColor} ${statusConfig.color}`} title={statusConfig.label}>
                                <statusConfig.icon size={10} />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-neutral-500 hover:text-red-400'}`}
                        >
                            <Heart size={18} className={isLiked ? 'fill-current' : ''} />
                            {likeCount > 0 && <span className="font-medium">{likeCount}</span>}
                        </button>
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white transition-colors"
                        >
                            <Share size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FeedView: React.FC<FeedViewProps> = ({ onNavigateToUser, onBookClick, currentUserFid }) => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMap, setUserMap] = useState<Record<number, any>>({});

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const data = await getGlobalReviews(20);

            // Get unique user FIDs
            const fids = [...new Set(data.map(r => r.userFid))];

            // Fetch user profiles
            const users: Record<number, any> = {};
            await Promise.all(fids.map(async (fid) => {
                let user = await getUserProfile(fid);
                if (user) users[fid] = user;
            }));

            setUserMap(users);
            setReviews(data);
        } catch (error) {
            console.error("Failed to load feed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageCircle className="text-blue-400" />
                    Latest Reviews
                </h2>
                <button
                    onClick={loadReviews}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                    Refresh
                </button>
            </div>

            {reviews.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-800">
                    <p>No reviews yet. Be the first to share your thoughts!</p>
                </div>
            ) : (
                reviews.map((review) => (
                    <ReviewCard
                        key={review.id || `${review.userFid}-${review.bookKey}`}
                        review={review}
                        user={userMap[review.userFid]}
                        statusConfig={STATUS_CONFIG[review.status]}
                        onBookClick={onBookClick}
                        onNavigateToUser={onNavigateToUser}
                        currentUserFid={currentUserFid}
                    />
                ))
            )}
        </div>
    );
};

export default FeedView;
