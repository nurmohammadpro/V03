export function CinematicVignette() {
  return (
    <>
      {/* Deep vintage film vignette - near-black edges pull inward */}
      <div
        className="fixed inset-0 z-5 pointer-events-none"
        style={{
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

      {/* Warm inner glow - film projector feel */}
      <div
        className="fixed inset-0 z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 500px 400px at center,
              rgba(60, 120, 220, 0.08) 0%,
              rgba(40, 60, 140, 0.04) 35%,
              transparent 65%
            )
          `,
        }}
      />

      {/* Subtle top/bottom film borders */}
      <div
        className="fixed top-0 left-0 right-0 z-5 pointer-events-none"
        style={{
          height: '4px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-5 pointer-events-none"
        style={{
          height: '4px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
        }}
      />
    </>
  );
}
