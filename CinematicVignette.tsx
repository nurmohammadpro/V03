export function CinematicVignette() {
  return (
    <>
      {/* Radial gradient vignette overlay - creates spotlight effect */}
      <div
        className="fixed inset-0 z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 800px 600px at center,
              rgba(30, 58, 138, 0) 0%,
              rgba(20, 40, 100, 0.15) 30%,
              rgba(10, 20, 60, 0.35) 60%,
              rgba(5, 10, 30, 0.6) 85%,
              rgba(0, 0, 0, 0.8) 100%
            )
          `,
        }}
      />

      {/* Additional dark vignette for more dramatic effect */}
      <div
        className="fixed inset-0 z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              circle at center,
              transparent 0%,
              rgba(0, 0, 0, 0.1) 40%,
              rgba(0, 0, 0, 0.4) 70%,
              rgba(0, 0, 0, 0.7) 100%
            )
          `,
        }}
      />

      {/* Subtle glow effect around center */}
      <div
        className="fixed inset-0 z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 1000px 800px at center,
              rgba(100, 150, 255, 0.08) 0%,
              rgba(50, 100, 200, 0.04) 30%,
              transparent 60%
            )
          `,
        }}
      />
    </>
  );
}
