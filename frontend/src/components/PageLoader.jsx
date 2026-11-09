// Full-screen splash shown while the page gets everything it needs (price in the
// visitor's currency, welcome offer) so nothing visibly changes after it appears.
export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center">
      <img src="/logo.png" alt="Flawless Natural Remedies" className="w-[150px] max-w-[50vw] h-auto rounded-3xl bg-black p-3" />
      <div className="mt-8 flex items-center gap-2" aria-label="Loading">
        <span className="loader-dot" style={{ animationDelay: "0s" }} />
        <span className="loader-dot" style={{ animationDelay: "0.18s" }} />
        <span className="loader-dot" style={{ animationDelay: "0.36s" }} />
      </div>
      <style>{`
        .loader-dot { width: 10px; height: 10px; border-radius: 9999px; background: #1f4d3a; animation: loaderdot 1s ease-in-out infinite; }
        @keyframes loaderdot { 0%, 80%, 100% { transform: scale(0.55); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
