import { Metadata } from 'next';

type Props = {
    searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const title = (searchParams.title as string) || "Read Goods";
    const imageUrl = (searchParams.image as string) || "https://read-goods.vercel.app/book-icon.png"; // Fixed: icon.png didn't exist

    const embedData = {
        version: "next", // Use 'next' for v2/miniapp compatibility
        imageUrl: imageUrl,
        button: {
            title: "Launch App",
            action: {
                type: "launch_frame", // Fixed: Standard action for launching frames/miniapps
                name: "Read Goods",
                url: "https://read-goods.vercel.app",
                splashImageUrl: "https://read-goods.vercel.app/book-icon.png",
                splashBackgroundColor: "#171717"
            }
        }
    };

    return {
        title: title,
        openGraph: {
            title: title,
            images: [imageUrl],
        },
        other: {
            "fc:miniapp": JSON.stringify(embedData),
            "fc:frame": JSON.stringify(embedData)
        }
    };
}

export default function SharePage() {
    return (
        <div style={{ padding: 20, fontFamily: 'sans-serif', textAlign: 'center', marginTop: '50px' }}>
            <h1>Read Goods</h1>
            <p>Redirecting to app...</p>
        </div>
    );
}
