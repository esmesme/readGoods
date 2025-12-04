import { Metadata } from "next";
import FrameApp from "./components/FrameApp";

export const metadata: Metadata = {
    title: "readGoods",
    description: "Log your reading journey.",
};

export default function Page() {
    return <FrameApp />;
}
