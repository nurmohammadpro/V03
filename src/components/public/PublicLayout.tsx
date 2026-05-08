import { PublicGradient } from "@/components/public/PublicGradient";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicGradient />
      {children}
    </>
  );
}
