export function MicroAction({ text, index }: { text: string; index: number }) {
  return (
    <li className="border border-text px-3 py-2 flex gap-4 text-xs uppercase tracking-wider">
      <span className="text-[var(--neon)]">{String(index).padStart(2, "0")}</span>
      <span className="normal-case">{text}</span>
    </li>
  );
}
