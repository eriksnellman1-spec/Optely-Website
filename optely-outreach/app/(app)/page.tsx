import { signOut } from "@/lib/actions/auth";

export default function HomePage() {
  return (
    <form action={signOut} className="p-6">
      <button type="submit">Logga ut</button>
    </form>
  );
}
