export function Footer() {
  const links = [
    { label: 'Pricing', href: '#pricing' },
    { label: 'Terms of Service', href: '#terms' },
    { label: 'Privacy Policy', href: '#privacy' },
    { label: 'Refund Policy', href: '#refunds' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 px-6 py-4 md:px-8 md:py-6">
      <div className="flex flex-wrap justify-center gap-6 md:gap-8">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm md:text-base text-blue-300/50 hover:text-blue-300/80 transition-colors duration-200 font-normal"
          >
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
