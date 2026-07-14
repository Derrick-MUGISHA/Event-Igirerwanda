"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { VenueEvent } from "@/lib/events";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
});

async function fetchEvents(): Promise<VenueEvent[]> {
  const { data } = await apiClient.get<{ events: VenueEvent[] }>("/events");
  return data.events;
}

/* One shared cache entry — Nav, Hero and the calendar all read from it,
   so the page makes a single request for the whole events feed. */
export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    staleTime: 60_000,
  });
}
