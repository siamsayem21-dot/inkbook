import DashboardStats from "@/components/owner/DashboardStats";
import BookingOverview from "@/components/owner/BookingOverview";
import RevenueChart from "@/components/owner/RevenueChart";

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Studio Dashboard</h1>
      <DashboardStats />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart />
        <BookingOverview />
      </div>
    </div>
  );
}
