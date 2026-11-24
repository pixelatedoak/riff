import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return (
    <div className="container">
      <h1 className="title">Riff</h1>
      <p className="description">Let others finish your thoughts!</p>
    </div>
  );
}
