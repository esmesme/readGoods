import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async redirects() {
        return [
            {
                source: '/.well-known/farcaster.json',
                destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/019aff68-1006-1aa7-edd8-36e2bd93e445',
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
