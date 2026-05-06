import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project } from "@/lib/types";

// Fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.getProjects();
      return res.projects.map((p) => ({
        ...p,
        status: "active" as const,
        userId: "",
      }));
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
      framework,
    }: {
      name: string;
      framework?: string;
    }) => {
      const res = await api.createProject(name, framework);
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
