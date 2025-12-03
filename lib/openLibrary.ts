export interface BookData {
    title: string;
    author_name?: string[];
    isbn?: string[];
    cover_i?: number;
    first_publish_year?: number;
    key: string;
}

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';

export async function searchBooks(query: string): Promise<BookData[]> {
    try {
        const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=5`);
        if (!response.ok) {
            throw new Error(`Open Library API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.docs as BookData[];
    } catch (error) {
        console.error('Error searching books:', error);
        return [];
    }
}

export async function getBookByISBN(isbn: string): Promise<BookData | null> {
    try {
        const url = `${OPEN_LIBRARY_SEARCH_URL}?isbn=${encodeURIComponent(isbn)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open Library API error: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.docs && data.docs.length > 0) {
            return data.docs[0] as BookData;
        }
        return null;
    } catch (error) {
        console.error('Error getting book by ISBN:', error);
        return null;
    }
}
