"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { scannersService } from "@/services/admin";
import type { ScannerCreateValues, ScannerEditValues } from "@/schemas/admin";
import { adminKeys } from "./keys";
import { errorMessage } from "./util";

export function useScanners() {
  return useQuery({
    queryKey: adminKeys.scanners,
    queryFn: () => scannersService.list().then((d) => d.scanners),
    staleTime: 15_000,
  });
}

/* single scanner, selected from the cached list (no dedicated GET endpoint) */
export function useScanner(id: string) {
  const q = useScanners();
  return { ...q, data: q.data?.find((s) => s.id === id) };
}

export function useCreateScanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ScannerCreateValues) => scannersService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.scanners });
      toast.success("Scanner account created");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateScanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: ScannerEditValues }) =>
      scannersService.update(vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.scanners });
      toast.success("Scanner updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteScanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scannersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.scanners });
      toast.success("Scanner deleted");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
