"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

export function Icon({ name, className = "", fill = true, size }: { name: string; className?: string; fill?: boolean; size?: number }) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{ fontVariationSettings: `"FILL" ${fill ? 1 : 0}, "wght" 500, "GRAD" 0, "opsz" 24`, fontSize: size }}
      aria-hidden
    >
      {name}
    </span>
  );
}

type BtnProps = HTMLMotionProps<"button"> & { children: ReactNode };

export function SteelButton({ children, className = "", ...rest }: BtnProps) {
  return (
    <motion.button
      whileHover={{ y: -2, filter: "brightness(1.25)" }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`steel-btn clip-tac-sm relative cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function OrangeButton({ children, className = "", ...rest }: BtnProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, filter: "brightness(1.1)" }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`metal-orange clip-tac relative cursor-pointer overflow-hidden ${className}`}
      {...rest}
    >
      <motion.span
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/40 blur-md"
        animate={{ left: ["-50%", "150%"] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
      />
      {children}
    </motion.button>
  );
}

/** Scales a fixed-height (720) landscape design to fill any viewport. */
export function Stage({ children }: { children: ReactNode }) {
  const [dim, setDim] = useState({ scale: 1, w: 1280, h: 720 });
  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let scale = vh / 720;
      if (vw / scale < 1120) scale = vw / 1120;
      setDim({ scale, w: vw / scale, h: vh / scale });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="landscape-root fixed inset-0 overflow-hidden bg-steel-950">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: dim.w, height: dim.h, transform: `scale(${dim.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="h-8 w-1.5 bg-cod-500 shadow-[0_0_10px_#f58a07]" />
      <div>
        <div className="font-display text-4xl leading-[0.8] tracking-wide emboss-text">{title}</div>
        {sub && <div className="mt-1 text-[11px] font-semibold tracking-[0.3em] text-steel-400">{sub}</div>}
      </div>
    </div>
  );
}
