export default function BillingSettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Billing & plan</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Studio plan</p>
            <p className="text-zinc-400 text-sm">$79/mo · up to 5 artists · renews June 27, 2026</p>
          </div>
          <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">Active</span>
        </div>
        <hr className="border-zinc-800" />
        <div>
          <p className="text-sm text-zinc-400 mb-3">Payment method</p>
          <div className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3">
            <span className="text-zinc-300 text-sm">•••• •••• •••• 4242</span>
            <span className="text-zinc-500 text-xs ml-auto">Visa</span>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full">Update card</button>
          <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full">Upgrade plan</button>
          <button className="text-sm text-red-400 hover:text-red-300 ml-auto">Cancel subscription</button>
        </div>
      </div>
    </div>
  );
}
