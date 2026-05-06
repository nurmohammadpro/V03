export function CinematicVignette() {
  return (
    <>
      {/* Deep vintage film vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: "var(--z-content)",
          background: `
            radial-gradient(
              ellipse 700px 500px at center,
              transparent 0%,
              rgba(0, 0, 0, 0.15) 20%,
              rgba(0, 0, 0, 0.4) 40%,
              rgba(0, 0, 0, 0.7) 60%,
              rgba(0, 0, 0, 0.88) 80%,
              rgba(0, 0, 0, 0.97) 100%
            )
          `,
        }}
      />

      {/* Warm inner glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: "var(--z-content)",
          background: `
            radial-gradient(
              ellipse 500px 400px at center,
              oklch(0.55 0.22 264 / 0.08) 0%,
              oklch(0.40 0.18 264 / 0.04) 35%,
              transparent 65%
            )
          `,
        }}
      />

      {/* Film border strips */}
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: "var(--z-content)",
          height: '4px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: "var(--z-content)",
          height: '4px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
        }}
      />
    </>
  );
}
