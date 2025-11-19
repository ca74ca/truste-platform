// pages/index.tsx

import React from "react";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>TRUSTE – Control AI. Verify Reality.</title>

        <meta
          name="description"
          content="AI is rising. Control it. TRUSTE detects fake content, verifies human effort, and protects creators."
        />

        <meta property="og:title" content="TRUSTE – Control AI. Verify Reality." />
        <meta
          property="og:description"
          content="The rising AI era needs a new layer of truth. TRUSTE verifies human effort, flags fakes, and protects creators."
        />

        <meta property="og:image" content="/truste_og_image.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
        {/* BACKGROUND VIDEO */}
        <video
          className="absolute top-0 left-0 w-full h-full object-cover opacity-90"
          src="/truste_intro_video1.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black/90 pointer-events-none" />

        {/* HERO CONTENT */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-white text-5xl md:text-6xl font-bold drop-shadow-lg">
            AI is rising.{" "}
            <span className="text-[#00FFC8] animate-pulse">Control it.</span>
          </h1>

          <p className="text-gray-200 text-lg md:text-xl mt-4 mb-8">
            Expose fakes.{" "}
            <span className="text-[#00FFC8] font-semibold">Verify real effort.</span>{" "}
            Trust what matters.
          </p>

          {/* CTA BUTTONS */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-6">
            
            <a
              href="/downloads/truste-extension.zip"
              className="px-8 py-3 text-white border border-[#00FFC8] rounded-lg hover:bg-[#00FFC8]/20 transition-all shadow-[#00FFC8]/40 shadow-md hover:shadow-lg"
            >
              Download Chrome Extension
            </a>

            <a
              href="/get-api-key"
              className="px-8 py-3 text-white border border-[#00FFC8] rounded-lg hover:bg-[#00FFC8]/20 transition-all shadow-[#00FFC8]/40 shadow-md hover:shadow-lg"
            >
              Get API Key
            </a>

            <a
              href="/docs/sdk"
              className="px-8 py-3 text-white border border-[#00FFC8] rounded-lg hover:bg-[#00FFC8]/20 transition-all shadow-[#00FFC8]/40 shadow-md hover:shadow-lg"
            >
              Explore the SDK
            </a>

          </div>
        </div>
      </div>
    </>
  );
}
