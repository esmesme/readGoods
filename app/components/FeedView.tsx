import React, { useEffect, useState } from 'react';
import { getGlobalReviews, getUserProfile } from '../../lib/firestoreUtils';
import { MessageCircle } from 'lucide-react';
import { STATUS_CONFIG } from './MainApp';
import ReviewCard from './ReviewCard';

interface FeedViewProps {
    onNavigateToUser: (fid: number) => void;
    onBookClick: (book: any) => void;
    currentUserFid?: number;
}


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
