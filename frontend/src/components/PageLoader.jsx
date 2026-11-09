// Full-screen splash shown while the page gets everything it needs (price in the
// visitor's currency, welcome offer) so nothing visibly changes after it appears.
export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center">
      <img src="/logo.png" alt="Flawless Natural Remedies" className="w-[150px] max-w-[50vw] h-auto rounded-3xl bg-black p-3" />
      <div className="mt-8 h-[3px] w-[140px] overflow-hidden rounded-full bg-[#1f4d3a]/10">
        <div className="h-full w-1/2 rounded-full bg-[#1f4d3a] animate-[loadbar_1.1s_ease-in-out_infinite]" />
      </div>
      <style>{`@keyframes loadbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}
