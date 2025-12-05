import { Metadata } from "next";
import FrameApp from "./components/FrameApp";

export const metadata: Metadata = {
    title: "readGoods",
    description: "Log your reading journey.",
    other: {
        "fc:frame": "vNext",
        "fc:frame:image": "https://read-goods.vercel.app/book-icon.png", // Placeholder, ideally absolute URL
        "fc:frame:button:1": "log your books to connect with others",
        "fc:frame:button:1:action": "link",
        "fc:frame:button:1:target": "https://read-goods.vercel.app", // Placeholder
    },
};

export default function Page() {
    return <FrameApp />;
}
