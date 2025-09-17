import { cn } from "@/lib/utils";

interface ServerSeparatorProps {
  className?: string;
}

export function ServerSeparator({ className }: ServerSeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("shrink-0 bg-border h-[1px] w-full", className)}
    />
  );
}
