"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EventFlowProvider } from "@/components/EventFlow";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <EventFlowProvider>{children}</EventFlowProvider>
    </QueryClientProvider>
  );
}
