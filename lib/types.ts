export type BookStatus = 'desired' | 'current' | 'completed';

export interface UserBook {
    bookKey: string;
    bookTitle: string;
    bookAuthors?: string[];
    coverId?: number;
    coverUrl?: string;
    status: BookStatus;
    loggedAt: Date;
    updatedAt: Date;
    logs?: any[]; // ReadingLog[] but avoiding circular dependency issues for now, or just array
}

export interface ReadingLog {
    id?: string;
    page: number;
    thoughts?: string;
    date: any; // Timestamp
    unit?: 'pages' | 'percent' | 'chapter';
}
