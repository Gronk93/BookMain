import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Separator {
  id: string;
  userId: string;
  bookId: string;
  title: string;
  startPage: number;
  endPage: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeparatorParams {
  title: string;
  startPage: number;
  endPage: number;
  color?: string;
}

export interface UpdateSeparatorParams {
  id: string;
  title?: string;
  startPage?: number;
  endPage?: number;
  color?: string;
}

export function useSeparators(bookId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["books", bookId, "separators"];

  const { data: separators = [], isLoading, refetch } = useQuery<Separator[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/books/${bookId}/separators`);
      if (!res.ok) throw new Error("Failed to fetch separators");
      return res.json();
    },
    enabled: !!bookId,
  });

  const createMutation = useMutation({
    mutationFn: async (params: CreateSeparatorParams) => {
      const res = await fetch(`/api/books/${bookId}/separators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to create separator");
      }
      return res.json() as Promise<Separator>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...params }: UpdateSeparatorParams) => {
      const res = await fetch(`/api/books/${bookId}/separators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to update separator");
      }
      return res.json() as Promise<Separator>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/books/${bookId}/separators/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete separator");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    separators,
    isLoading,
    refetch,
    createSeparator: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSeparator: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteSeparator: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
