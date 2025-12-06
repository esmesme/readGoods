import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Compress and resize an image to be under the target size
 * @param file - The original image file
 * @param maxSizeKB - Maximum file size in KB (default 200KB)
 * @returns Compressed image as a Blob
 */
async function compressImage(file: File, maxSizeKB: number = 200): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Calculate new dimensions (max 800px width/height while maintaining aspect ratio)
                let width = img.width;
                let height = img.height;
                const maxDimension = 800;

                if (width > height && width > maxDimension) {
                    height = (height * maxDimension) / width;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = (width * maxDimension) / height;
                    height = maxDimension;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Start with quality 0.9 and reduce if needed
                let quality = 0.9;
                const tryCompress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Failed to compress image'));
                                return;
                            }

                            const sizeKB = blob.size / 1024;

                            // If under target size or quality is already very low, return
                            if (sizeKB <= maxSizeKB || quality <= 0.3) {
                                resolve(blob);
                            } else {
                                // Reduce quality and try again
                                quality -= 0.1;
                                tryCompress();
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                tryCompress();
            };
            img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
    });
}

/**
 * Upload a book cover image to Firebase Storage
 * @param file - The image file to upload
 * @param bookId - The unique ID of the book (used for the storage path)
 * @returns The download URL of the uploaded image
 */
export async function uploadBookCover(file: File, bookId: string): Promise<string> {
    try {
        // Compress the image to under 200KB
        const compressedBlob = await compressImage(file, 200);

        // Create a reference to the storage location
        const storageRef = ref(storage, `book-covers/${bookId}`);

        // Upload the compressed file
        await uploadBytes(storageRef, compressedBlob);

        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading book cover:', error);
        throw error;
    }
}
