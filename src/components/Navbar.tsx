import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

interface NavbarProps {
  onUserIconClick: () => void;
}

export function Navbar({ onUserIconClick }: NavbarProps) {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 md:px-8 md:py-6">
      <a href="/" className="flex items-center">
        <img
          src="/v03.svg"
          alt="v03.tech"
          className="h-8 md:h-9 w-auto"
        />
      </a>

      <Button
        variant="ghost"
        size="icon"
        onClick={onUserIconClick}
        className="rounded-full hover:bg-white/5 transition-colors"
        aria-label="User menu"
      >
        <User className="w-5 h-5 text-white/60" />
      </Button>
    </nav>
  );
}
