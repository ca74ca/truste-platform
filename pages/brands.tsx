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
