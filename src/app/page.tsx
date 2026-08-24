import { isAuthenticated } from "@/lib/auth";
import { Login } from "@/components/login";
import { Dashboard } from "@/components/dashboard";
export default async function Home() {
  return (await isAuthenticated()) ? <Dashboard /> : <Login />;
}
