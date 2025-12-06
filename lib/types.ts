export type BookStatus = 'desired' | 'current' | 'completed';

export interface UserBook {
    bookKey: string;
    bookTitle: string;
    bookAuthors?: string[];
    coverId?: number;
    status: BookStatus;
    loggedAt: Date;
    updatedAt: Date;
}
