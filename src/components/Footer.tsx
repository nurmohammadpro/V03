import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterProps {
  links?: FooterLink[];
  children?: React.ReactNode;
  className?: string;
  fixed?: boolean;
}

const defaultLinks: FooterLink[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refund", href: "/refund" },
];

export function Footer({ links = defaultLinks, children, className, fixed = true }: FooterProps) {
  return (
    <footer
      className={cn(
        fixed ? "fixed bottom-0 left-0 right-0 px-4 py-2.5 md:px-8 md:py-4" : "px-4 py-6 md:px-8",
        className
      )}
      style={fixed ? { zIndex: "var(--z-footer)" } : undefined}
    >
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 md:gap-x-6">
        {links.map((link) => (
          link.href.startsWith("#") ? (
            <a
              key={link.label}
              href={link.href}
              className="text-[10px] md:text-xs text-white/40 hover:text-white/70 transition-colors duration-[var(--duration-normal)] font-light whitespace-nowrap"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="text-[10px] md:text-xs text-white/40 hover:text-white/70 transition-colors duration-[var(--duration-normal)] font-light whitespace-nowrap"
            >
              {link.label}
            </Link>
          )
        ))}
        {children}
      </div>
    </footer>
  );
}
