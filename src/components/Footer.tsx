export function Footer() {
  const links = [
    { label: 'Pricing', href: '#pricing' },
    { label: 'Terms', href: '#terms' },
    { label: 'Privacy', href: '#privacy' },
    { label: 'Refund', href: '#refunds' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 px-4 py-2.5 md:px-8 md:py-4">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 md:gap-x-6">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-[9px] md:text-xs text-blue-300/35 hover:text-blue-300/70 transition-colors duration-200 font-extralight whitespace-nowrap"
          >
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
