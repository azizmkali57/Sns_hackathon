export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#1E293B] p-6 rounded-2xl border border-[#334155] shadow-xl">
        {children}
      </div>
    </div>
  );
}