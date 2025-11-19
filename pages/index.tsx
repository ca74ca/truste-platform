// pages/index.tsx

import React from "react";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>TRUSTE</title>
        <meta
          name="description"
          content="AI is rising. Control it. See what's fake and TRUSTE what's real."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* FULLSCREEN BACKGROUND VIDEO */}
      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center font-sans">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/truste_intro_video1.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black/80 pointer-events-none" />

        {/* HERO CONTENT */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-white text-5xl md:text-6xl font-bold drop-shadow-lg">
            AI is rising. <span className="text-[#00FFC8]">Control it.</span>
          </h1>

          <p className="text-gray-200 text-lg md:text-xl mt-4 mb-8">
            See what&apos;s fake.{" "}
            <span className="text-[#00FFC8] font-semibold">TRUSTE</span>{" "}
            what&apos;s real.
          </p>

          {/* CTA BUTTONS */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-6">
            <a
              href="/downloads/truste-extension.zip"
              className="px-8 py-3 text-white border border-[#00FFC8] rounded-lg hover:bg-[#00FFC8]/20 transition-all shadow-lg"
            >
              Download Chrome Extension
            </a>

            <a
              href="/get-api-key"
              className="px-8 py-3 text-white border border-[#00FFC8] rounded-lg hover:bg-[#00FFC8]/20 transition-all shadow-lg"
            >
              Get API Key
            </a>

            <a
              href="/docs/sdk"
              className="px-8 py-3 text-white border border-[#00FFC8] rounded-lg hover:bg-[#00FFC8]/20 transition-all shadow-lg"
            >
              Explore the SDK
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
