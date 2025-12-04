import { NextResponse } from "next/server";

export type FrameButton = {
    label: string;
    action?: "post" | "post_redirect" | "link" | "mint" | "tx";
    target?: string;
};

export type FrameInput = {
    text: string;
};

export type FrameImage = {
    src: string;
    aspectRatio?: "1.91:1" | "1:1";
};

export type FrameResponseOptions = {
    buttons?: FrameButton[];
    image: FrameImage;
    input?: FrameInput;
    postUrl?: string;
    state?: string;
};

export function getFrameHtmlResponse(options: FrameResponseOptions): NextResponse {
    const { buttons, image, input, postUrl, state } = options;

    const metaTags: string[] = [
        '<meta property="fc:frame" content="vNext" />',
        `<meta property="fc:frame:image" content="${image.src}" />`,
        `<meta property="og:image" content="${image.src}" />`,
    ];

    if (image.aspectRatio) {
        metaTags.push(`<meta property="fc:frame:image:aspect_ratio" content="${image.aspectRatio}" />`);
    }

    if (input) {
        metaTags.push(`<meta property="fc:frame:input:text" content="${input.text}" />`);
    }

    if (buttons) {
        buttons.forEach((button, index) => {
            const buttonIndex = index + 1;
            metaTags.push(`<meta property="fc:frame:button:${buttonIndex}" content="${button.label}" />`);
            if (button.action) {
                metaTags.push(`<meta property="fc:frame:button:${buttonIndex}:action" content="${button.action}" />`);
            }
            if (button.target) {
                metaTags.push(`<meta property="fc:frame:button:${buttonIndex}:target" content="${button.target}" />`);
            }
        });
    }

    if (postUrl) {
        metaTags.push(`<meta property="fc:frame:post_url" content="${postUrl}" />`);
    }

    if (state) {
        metaTags.push(`<meta property="fc:frame:state" content="${encodeURIComponent(state)}" />`);
    }

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Frame</title>
        ${metaTags.join('\n')}
      </head>
      <body>
        <h1>Frame</h1>
      </body>
    </html>
  `;

    return new NextResponse(html, {
        headers: {
            "Content-Type": "text/html",
        },
    });
}
