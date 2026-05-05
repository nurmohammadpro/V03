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
      {/* Logo */}
      <a href="/" className="flex items-center">
        <img
          src="/v03.svg"
          alt="v03.tech"
          className="h-7 md:h-8 w-auto opacity-80 hover:opacity-100 transition-opacity"
        />
      </a>

      {/* User Icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onUserIconClick}
        className="rounded-full hover:bg-white/10 transition-colors"
        aria-label="User menu"
      >
        <User className="w-5 h-5 text-blue-300" />
      </Button>
    </nav>
  );
}
