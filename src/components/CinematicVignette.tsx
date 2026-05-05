export function CinematicVignette() {
  return (
    <>
      {/* Deep vintage vignette - almost black edges, glowing center */}
      <div
        className="fixed inset-0 z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 800px 600px at center,
              transparent 0%,
              rgba(0, 0, 0, 0.3) 35%,
              rgba(0, 0, 0, 0.6) 60%,
              rgba(0, 0, 0, 0.85) 80%,
              rgba(0, 0, 0, 0.95) 100%
            )
          `,
        }}
      />

      {/* Subtle blue glow at center */}
      <div
        className="fixed inset-0 z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 600px 450px at center,
              rgba(40, 80, 180, 0.06) 0%,
              transparent 60%
            )
          `,
        }}
      />
    </>
  );
}
