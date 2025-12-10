import { Metadata } from 'next';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
    const searchParams = await props.searchParams;
    const title = (searchParams.title as string) || "Read Goods";
    // User requested "desire-icon.png", assuming they meant "desired-icon.png" which exists
    const imageUrl = (searchParams.image as string) || "https://read-goods.vercel.app/desired-icon.png";
    const userFid = searchParams.userFid as string;

    const appUrl = userFid
        ? `https://read-goods.vercel.app?userFid=${userFid}`
        : "https://read-goods.vercel.app";

    const embedData = {
        version: "next", // Use 'next' for v2/miniapp compatibility
        imageUrl: imageUrl,
        button: {
            title: "Launch App",
            action: {
                type: "launch_frame", // Fixed: Standard action for launching frames/miniapps
                name: "Read Goods",
                url: appUrl,
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

import Redirect from './Redirect';

export default async function SharePage(props: Props) {
    const searchParams = await props.searchParams;
    const userFid = searchParams.userFid as string;

    // Redirect to home with param, or just home if valid logic suggests
    const target = userFid ? `/?userFid=${userFid}` : '/';

    return <Redirect to={target} />;
}
