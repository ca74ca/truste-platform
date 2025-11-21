export default function Brands() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* Fullscreen Video */}
      <video
        src="/varaci_main_ui_.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="fixed top-0 left-0 w-screen h-screen object-cover object-center z-0"
      />

      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/50 z-10" />

      {/* --- ORBITAL FRAUD TEXT NODES (NO MODALS YET) --- */}
      <div className="absolute inset-0 z-30 pointer-events-auto">
        {/* Container for orbit layout */}
        <div className="w-full h-full relative">

          {/* 1. Fake Creators */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ top: "12%", left: "20%" }}
          >
            Fake Creators
          </div>

          {/* 2. AI-Generated UGC */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ top: "22%", right: "18%" }}
          >
            AI-Generated UGC
          </div>

          {/* 3. Bot Engagement */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ top: "40%", left: "10%" }}
          >
            Bot Engagement
          </div>

          {/* 4. Deepfake Product Ads */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ top: "38%", right: "12%" }}
          >
            Deepfake Product Ads
          </div>

          {/* 5. Clickbait Funnels */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ top: "62%", left: "18%" }}
          >
            Clickbait Funnels
          </div>

          {/* 6. Fake Testimonials */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ top: "60%", right: "20%" }}
          >
            Fake Testimonials
          </div>

          {/* 7. Spam/Bot Traffic */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ bottom: "14%", left: "30%" }}
          >
            Spam / Bot Traffic
          </div>

          {/* 8. Synthetic Review Farms */}
          <div
            className="absolute text-white/80 hover:text-white transition-all duration-200 
                       hover:scale-[1.05] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]
                       animate-drift"
            style={{ bottom: "12%", right: "26%" }}
          >
            Synthetic Review Farms
          </div>
        </div>
      </div>

      {/* Center Text Block */}
      <div className="fixed inset-0 flex items-center justify-center px-6 md:px-12 lg:px-24 z-20">
        <h1
          className="
            text-3xl md:text-5xl lg:text-6xl 
            font-extrabold leading-tight 
            tracking-tight text-white
            w-full text-center
          "
        >
          VARACIS DETECTS FAKE CONTENT, FAKE CREATORS & FAKE UGC POSING AS REAL HUMAN SIGNALS.
        </h1>
      </div>

    </div>
  );
}
