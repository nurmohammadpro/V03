import { Link } from "wouter"

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center">
        <h1 className="font-heading text-6xl font-light mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-lg text-muted-foreground mb-6 font-light">Page not found</p>
        <Link
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-light rounded-lg hover:from-blue-600 hover:to-cyan-500 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
