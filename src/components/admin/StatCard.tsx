import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TONES = {
  orange: "bg-orange-100 text-orange-600",
  green: "bg-green-100 text-green-700",
  blue: "bg-sky-100 text-sky-700",
  zinc: "bg-stone-100 text-stone-600",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "zinc",
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof TONES;
  loading?: boolean;
}) {
  return (
    <Card className="gap-0 py-4 shadow-none">
      <CardContent className="flex items-center gap-3.5 px-4">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="display text-2xl font-semibold leading-none tabular-nums text-foreground">
              {value}
            </p>
          )}
          <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {hint && <p className="truncate text-[11px] text-muted-foreground/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
