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
        ${show ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"}
      `}
      style={{
        animation: show ? "varacisDrop 1s ease-out forwards" : "none",
      }}
    >
      <nav className="space-y-10 text-2xl tracking-wide font-light pointer-events-auto">
        <span className="hover:text-white/70 transition cursor-pointer">
          BRANDS & AGENCIES
        </span>

        <span className="hover:text-white/70 transition cursor-pointer">
          APPS & PLATFORMS
        </span>

        <span className="hover:text-white/70 transition cursor-pointer">
          EVERYDAY USERS
        </span>
      </nav>
    </div>
  );
}
