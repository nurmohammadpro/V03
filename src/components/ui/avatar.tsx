import { cn } from "@/lib/utils"

interface AvatarProps extends React.ComponentProps<"div"> {
  size?: "sm" | "default" | "lg"
}

function Avatar({ className, size = "default", children, ...props }: AvatarProps) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        size === "sm" && "h-7 w-7",
        size === "default" && "h-9 w-9",
        size === "lg" && "h-11 w-11",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<"img">) {
  return (
    <img
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
