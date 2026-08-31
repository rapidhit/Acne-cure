const COLORS = ["#0f3d1f", "#a3d65c", "#dc2626", "#f59e0b", "#3654FF"];

export default function ConfettiBurst() {
  const pieces = Array.from({ length: 26 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1 + Math.random() * 0.6,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
