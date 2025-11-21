import React, { useEffect, useState } from "react";

export default function VaracisSidebar() {
  const [show, setShow] = useState(false);

  // 10 second delay before drop
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        fixed left-6 top-0 h-screen 
        flex flex-col justify-center 
        text-white pointer-events-none
        transition-all duration-700
        z-30
        ${show ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"}
      `}
      style={{
        animation: show ? "varacisDrop 1s ease-out forwards" : "none",
      }}
    >
      <div className="flex flex-col space-y-4 text-left pointer-events-auto">

        <a
          href="/brands"
          className="text-white text-sm tracking-wide hover:text-[#c5ffdb] transition-colors"
        >
          BRANDS & AGENCIES
        </a>

        <a
          href="/platforms"
          className="text-white text-sm tracking-wide hover:text-[#d0ffe5] transition-colors"
        >
          APPS & PLATFORMS
        </a>

        <a
          href="/everyday_users"
          className="text-white text-sm tracking-wide hover:text-[#e5fff0] transition-colors"
        >
          EVERYDAY USERS
        </a>

      </div>
    </div>
  );
}
