"use client";

import { useEffect, useState } from "react";

export function Timer({
  initialSeconds,
  label,
}: {
  initialSeconds: number;
  label: string;
}) {
  const [left, setLeft] = useState(initialSeconds);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mins = Math.floor(left / 60);
  const secs = left % 60;

  return (
    <div className="flex flex-col items-center gap-3 border-2 border-text p-8">
      <span className="label text-[var(--neon)]">{label}</span>
      <span className="font-mono text-4xl tracking-tighter tabular-nums">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}
