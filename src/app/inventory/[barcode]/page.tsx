import { Dashboard } from "@/components/dashboard";
import { Login } from "@/components/login";
import { isAuthenticated } from "@/lib/auth";
export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ barcode: string }>;
}) {
  const { barcode } = await params;
  return (await isAuthenticated()) ? (
    <Dashboard initialBarcode={decodeURIComponent(barcode).toUpperCase()} />
  ) : (
    <Login />
  );
}
