import React from "react";

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* Fullscreen Video */}
      <video
        src="/veracis_homepage_intro.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Center Text Block */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-white text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          VARACIS AI
        </h1>

        <p className="mt-4 text-white/90 text-lg md:text-2xl font-light max-w-3xl drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]">
          The First Living, Evolving Intelligence  
          Designed to Help Keep the World Real.
        </p>
      </div>

    </div>
  );
}
