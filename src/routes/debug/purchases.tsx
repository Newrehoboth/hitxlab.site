import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/debug/purchases")({
  component: DebugPurchases,
});

function DebugPurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      // Check purchases table
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Check orders table
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      console.log("Purchases:", purchasesData, purchasesError);
      console.log("Orders:", ordersData, ordersError);

      setPurchases(purchasesData || []);
      setOrders(ordersData || []);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold mb-4">Debug: Purchases</h1>
          <p>Please log in to see your purchases.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold mb-4">Debug: Purchases</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-4 text-white">Debug: Purchases</h1>
        
        <div className="mb-8 p-4 bg-surface rounded-lg border border-white/10">
          <h2 className="text-lg font-semibold mb-2 text-white">User Info</h2>
          <p className="text-sm text-gray-300">Email: {user.email}</p>
          <p className="text-sm text-gray-300">User ID: {user.id}</p>
        </div>

        <div className="mb-8 p-4 bg-surface rounded-lg border border-white/10">
          <h2 className="text-lg font-semibold mb-2 text-white">
            Purchases Table ({purchases.length} records)
          </h2>
          {purchases.length === 0 ? (
            <p className="text-sm text-gray-400">No purchases found in purchases table.</p>
          ) : (
            <pre className="text-xs text-gray-300 overflow-auto">
              {JSON.stringify(purchases, null, 2)}
            </pre>
          )}
        </div>

        <div className="mb-8 p-4 bg-surface rounded-lg border border-white/10">
          <h2 className="text-lg font-semibold mb-2 text-white">
            Orders Table ({orders.length} records)
          </h2>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400">No orders found in orders table.</p>
          ) : (
            <pre className="text-xs text-gray-300 overflow-auto">
              {JSON.stringify(orders, null, 2)}
            </pre>
          )}
        </div>

        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> This debug page shows what's in your database tables. 
            If you don't see your purchase here, it means the payment succeeded but the 
            purchase wasn't recorded in the database.
          </p>
        </div>
      </div>
    </div>
  );
}
