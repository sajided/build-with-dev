import type { ChatRole } from "@/lib/types";

export function MessageBubble({
  role,
  content,
}: {
  role: ChatRole;
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`max-w-[90%] border-2 px-4 py-3 text-sm whitespace-pre-wrap ${
        isUser ? "border-text ml-auto bg-bg" : "border-[var(--neon)] mr-auto text-[var(--neon)]"
      }`}
    >
      {content}
    </div>
  );
}
