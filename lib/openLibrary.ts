export interface BookData {
    title: string;
    author_name?: string[];
    isbn?: string[];
    cover_i?: number;
    first_publish_year?: number;
    key: string;
}

export interface BookDetails {
    title: string;
    description?: string;
    authors?: { name: string }[];
    subjects?: string[];
    publish_date?: string;
    publishers?: string[];
    number_of_pages?: number;
    covers?: number[];
}

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_WORKS_URL = 'https://openlibrary.org';

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

export async function getBookDetails(workKey: string): Promise<BookDetails | null> {
    try {
        const response = await fetch(`${OPEN_LIBRARY_WORKS_URL}${workKey}.json`);
        if (!response.ok) {
            throw new Error(`Open Library API error: ${response.statusText}`);
        }
        const data = await response.json();

        // Description can be a string or an object with a value property
        let description = '';
        if (data.description) {
            if (typeof data.description === 'string') {
                description = data.description;
            } else if (data.description.value) {
                description = data.description.value;
            }
        }

        return {
            title: data.title,
            description,
            authors: data.authors,
            subjects: data.subjects?.slice(0, 10), // Limit to 10 subjects
            publish_date: data.first_publish_date,
            covers: data.covers,
        };
    } catch (error) {
        console.error('Error getting book details:', error);
        return null;
    }
}
