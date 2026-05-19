import { redirect } from "next/navigation";

/** Middleware handles redirects; fallback for direct hits. */
export default function Home() {
  redirect("/today");
}
