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
      {/* Logo - Bodoni */}
      <div className="font-heading text-2xl md:text-3xl font-extralight tracking-normal">
        <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
          v03.tech
        </span>
      </div>

      {/* User Icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onUserIconClick}
        className="rounded-full hover:bg-white/10 transition-colors"
        aria-label="User menu"
      >
        <User className="w-6 h-6 text-blue-300" />
      </Button>
    </nav>
  );
}
