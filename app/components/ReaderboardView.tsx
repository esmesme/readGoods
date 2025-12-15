
import { useEffect, useState } from "react";
import { getLeaderboard } from "@/lib/firestoreUtils";
import { CircleUserRound, Trophy, Crown } from "lucide-react";

interface ReaderboardEntry {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    currentPoints: number;
}

interface ReaderboardViewProps {
    effectiveUser: any;
}

export default function ReaderboardView({ effectiveUser }: ReaderboardViewProps) {
    const [leaderboard, setLeaderboard] = useState<ReaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const data = await getLeaderboard(100);
            setLeaderboard(data);
            setLoading(false);
        };
        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown size={20} className="text-yellow-400" fill="currentColor" />;
            case 2: return <Crown size={20} className="text-neutral-400" fill="currentColor" />;
            case 3: return <Crown size={20} className="text-amber-700" fill="currentColor" />;
            default: return <span className="text-neutral-500 font-mono w-5 text-center">{rank}</span>;
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700 shadow-lg">
                    <Trophy size={32} className="text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Readerboard</h2>
                <p className="text-neutral-400">Top readers by points earned</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="divide-y divide-neutral-800">
                        {leaderboard.map((user, index) => {
                            const rank = index + 1;
                            const isCurrentUser = user.fid === effectiveUser?.fid;

                            return (
                                <div
                                    key={user.fid}
                                    className={`flex items-center p-4 ${isCurrentUser ? 'bg-blue-900/10' : 'hover:bg-neutral-800/50'
                                        } transition-colors`}
                                >
                                    {/* Rank */}
                                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                        {getRankIcon(rank)}
                                    </div>

                                    {/* User */}
                                    <div className="flex-1 flex items-center min-w-0 ml-2">
                                        {user.pfpUrl ? (
                                            <img
                                                src={user.pfpUrl}
                                                alt={user.username}
                                                className="w-10 h-10 rounded-full border border-neutral-700 object-cover mr-3"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mr-3 text-neutral-500">
                                                <CircleUserRound size={20} />
                                            </div>
                                        )}
                                        <div className="truncate">
                                            <div className="font-semibold text-white truncate flex items-center">
                                                {user.displayName || user.username || `User ${user.fid}`}
                                                {isCurrentUser && (
                                                    <span className="ml-2 text-[10px] bg-blue-600 px-1.5 py-0.5 rounded text-white font-medium uppercase tracking-wider">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-neutral-500 truncate">
                                                @{user.username || user.fid}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Points */}
                                    <div className="ml-4 text-right">
                                        <div className="text-lg font-bold text-white tabular-nums">
                                            {(user.currentPoints || 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-neutral-500 uppercase font-medium tracking-wider">
                                            pts
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {leaderboard.length === 0 && (
                        <div className="text-center py-12 text-neutral-500">
                            No points awarded yet. Start reading to climb the ranks!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
