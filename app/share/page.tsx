import { Metadata } from 'next';

type Props = {
    searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const title = (searchParams.title as string) || "Read Goods";
    const imageUrl = (searchParams.image as string) || "https://read-goods.vercel.app/icon.png"; // Fallback placeholder

    const embedData = {
        version: "1",
        imageUrl: imageUrl,
        button: {
            title: "Launch App",
            action: {
                type: "launch_miniapp",
                url: "https://read-goods.vercel.app",
                splashImageUrl: "https://read-goods.vercel.app/icon.png",
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
