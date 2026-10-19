import { redirect } from "next/navigation";

export default function ProfilePage() {
  // Redireciona para dashboard (onde o perfil deve estar)
  redirect("/dashboard");
}
