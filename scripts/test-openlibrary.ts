import { searchBooks, getBookByISBN } from '../lib/openLibrary';

async function test() {
    console.log('Testing Open Library Integration...');

    console.log('\n1. Searching for "The Great Gatsby"...');
    const results = await searchBooks('The Great Gatsby');
    console.log(`Found ${results.length} results.`);
    if (results.length > 0) {
        console.log('First result:', results[0].title, results[0].author_name);
    } else {
        console.error('FAILED: No results found for "The Great Gatsby"');
    }

    console.log('\n2. Searching for ISBN "9780743273565"...');
    const book = await getBookByISBN('9780743273565');
    if (book) {
        console.log('Found book:', book.title);
    } else {
        console.error('FAILED: Book not found by ISBN');
    }
}

test();
