"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { participantsService, downloadBlob, type ParticipantFilters } from "@/services/admin";
import type { ParticipantCreateValues, ParticipantEditValues } from "@/schemas/admin";
import { adminKeys } from "./keys";
import { errorMessage } from "./util";

export function useParticipants(filters: ParticipantFilters = {}) {
  return useQuery({
    queryKey: adminKeys.participants(filters),
    queryFn: () => participantsService.list(filters).then((d) => d.attendees),
    staleTime: 10_000,
  });
}

export function useParticipant(id: string) {
  return useQuery({
    queryKey: adminKeys.participant(id),
    queryFn: () => participantsService.get(id),
    enabled: !!id,
  });
}

export function useCreateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ParticipantCreateValues) => participantsService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.participantsAll });
      toast.success("Participant registered");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: ParticipantEditValues }) =>
      participantsService.update(vars.id, vars.body),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: adminKeys.participantsAll });
      qc.invalidateQueries({ queryKey: adminKeys.participant(vars.id) });
      toast.success("Participant updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/* approve / reject is just a registrationStatus update — separate hook so lists
   can call it inline with a clear label */
export function useSetRegistrationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; registrationStatus: "APPROVED" | "REJECTED" | "PENDING" }) =>
      participantsService.update(vars.id, { registrationStatus: vars.registrationStatus }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: adminKeys.participantsAll });
      qc.invalidateQueries({ queryKey: adminKeys.participant(vars.id) });
      toast.success(
        vars.registrationStatus === "APPROVED"
          ? "Registration approved"
          : vars.registrationStatus === "REJECTED"
            ? "Registration rejected"
            : "Set to pending"
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => participantsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.participantsAll });
      toast.success("Participant deleted");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useExportParticipants() {
  return useMutation({
    mutationFn: (eventId?: string) =>
      downloadBlob(
        `/api/admin/attendees/export${eventId ? `?event=${eventId}` : ""}`,
        `guests-${new Date().toISOString().slice(0, 10)}.csv`
      ),
    onSuccess: () => toast.success("Export downloaded"),
    onError: (e) => toast.error(errorMessage(e)),
  });
}
