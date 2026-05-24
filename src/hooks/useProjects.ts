import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project } from "@/lib/types";

// Fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.getProjects();
      return res.projects.map(
        (p): Project => ({
          id: p.id,
          name: p.name,
          framework: p.framework ?? p.frameworkKind,
          userId: p.userId,
          createdAt: p.createdAt,
          status: "active",
        }),
      );
    },
    staleTime: 30_000,
  });
}

// Create a project
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      frameworkKind,
    }: {
      name: string;
      frameworkKind?: string;
    }) => {
      const res = await api.createProject(name, frameworkKind);
      return res.project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// Delete a project
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.deleteProject(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.archiveProject(id, true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDuplicateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const res = await api.duplicateProject(id, name);
      return res.project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
