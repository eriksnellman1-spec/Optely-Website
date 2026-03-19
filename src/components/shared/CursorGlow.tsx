"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.setProperty("--x", `${e.clientX}px`);
      glowRef.current.style.setProperty("--y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed inset-0 z-30 hidden md:block"
      style={{
        background:
          "radial-gradient(600px circle at var(--x, -600px) var(--y, -600px), rgba(37,99,235,0.06), transparent 40%)",
      }}
    />
  );
}
