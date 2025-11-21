import React from "react";
import VaracisSidebar from "@/components/VaracisSidebar";

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
        className="fixed top-0 left-0 w-screen h-screen object-cover object-center z-0"
      />

      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/50 z-10" />

      {/* Varacis Sidebar Menu */}
      <VaracisSidebar />

      {/* Center Text Block */}
      <div className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center z-20">
        <h1 className="text-white text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          VARACIS AI
        </h1>

        <p className="mt-4 text-white/90 text-lg md:text-2xl font-light max-w-3xl drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]">
          The First Living, Evolving Intelligence  
          Designed to keep the World Real.
        </p>
      </div>

    </div>
  );
}
