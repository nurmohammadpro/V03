export function PublicGradient() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 900px 600px at 50% 40%,
              color-mix(in srgb, var(--app-accent) 14%, transparent) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 800px 800px at 50% 50%,
              transparent 0%,
              color-mix(in srgb, var(--background) 12%, transparent) 100%
            )
          `,
        }}
      />
    </div>
  );
}
