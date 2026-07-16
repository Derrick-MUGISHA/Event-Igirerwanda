"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUpIcon, TrendingDownIcon, RadioIcon, MailIcon, UserCheckIcon } from "lucide-react"
import type { DashboardStats } from "@/types/admin"

/* real day-over-day trend from the check-ins series */
function dailyTrend(daily: { day: string; count: number }[]) {
  if (daily.length < 2) return { text: `${daily.at(-1)?.count ?? 0} today`, up: true }
  const last = daily.at(-1)!.count
  const prev = daily.at(-2)!.count
  if (prev === 0) return { text: last > 0 ? "New today" : "Steady", up: last > 0 }
  const pct = Math.round(((last - prev) / prev) * 100)
  return { text: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 }
}

export function SectionCards({ data, loading }: { data?: DashboardStats; loading?: boolean }) {
  const g = data?.global
  const a = data?.attendance
  const trend = dailyTrend(a?.dailyCheckins ?? [])
  const rate = a?.liveAttendanceRate ?? 0

  const N = (v: number | undefined) =>
    loading ? <Skeleton className="h-8 w-20" /> : (v ?? 0).toLocaleString()

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Tickets issued</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {N(g?.totalTicketsGenerated)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <MailIcon />
              {g?.totalTicketsSent ?? 0} sent
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Passes generated <MailIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {g?.totalTicketsScanned ?? 0} scanned at the gate
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Check-ins</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {N(a?.totalAttendance)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {trend.up ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {trend.text}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            At the gate <UserCheckIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {a?.currentAttendance ?? 0} checked in to live events
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active events</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {N(g?.activeEvents)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RadioIcon />
              {(g?.activeEvents ?? 0) > 0 ? "Live" : "None"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Happening now <RadioIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {g?.upcomingEvents ?? 0} upcoming · {g?.completedEvents ?? 0} completed
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Live attendance rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? <Skeleton className="h-8 w-16" /> : `${rate}%`}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {rate >= 50 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {a?.averageAttendance ?? 0} avg
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Current vs issued{" "}
            {rate >= 50 ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />}
          </div>
          <div className="text-muted-foreground">Across events in progress</div>
        </CardFooter>
      </Card>
    </div>
  )
}
