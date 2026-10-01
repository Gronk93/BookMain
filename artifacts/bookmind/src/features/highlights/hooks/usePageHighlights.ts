import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Highlight, type HighlightColor, type HighlightCategory, type BoundingBox } from "../types";

export interface CreateHighlightParams {
  pageNumber: number;
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
  exactText: string;
  prefixText?: string;
  suffixText?: string;
  color?: HighlightColor;
  category?: HighlightCategory;
  boundingBoxes?: BoundingBox[];
}

export interface UpdateHighlightParams {
  highlightId: string;
  color?: HighlightColor;
  category?: HighlightCategory | null;
}

export function usePageHighlights(bookId: string, pageNumber?: number) {
  const queryClient = useQueryClient();
  const queryKey = ["books", bookId, "highlights", pageNumber ?? "all"];

  // Fetch highlights
  const { data: highlights = [], isLoading, refetch } = useQuery<Highlight[]>({
    queryKey,
    queryFn: async () => {
      const url = pageNumber
        ? `/api/books/${bookId}/highlights?pageNumber=${pageNumber}`
        : `/api/books/${bookId}/highlights`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch highlights");
      return res.json();
    },
    enabled: !!bookId,
  });

  // Create highlight mutation
  const createMutation = useMutation({
    mutationFn: async (params: CreateHighlightParams) => {
      const res = await fetch(`/api/books/${bookId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to create highlight");
      }
      return res.json() as Promise<Highlight>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", bookId, "highlights"] });
    },
  });

  // Update highlight mutation
  const updateMutation = useMutation({
    mutationFn: async ({ highlightId, color, category }: UpdateHighlightParams) => {
      const res = await fetch(`/api/books/${bookId}/highlights/${highlightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color, category }),
      });
      if (!res.ok) throw new Error("Failed to update highlight");
      return res.json() as Promise<Highlight>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", bookId, "highlights"] });
    },
  });

  // Delete highlight mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (highlightId: string) => {
      const res = await fetch(`/api/books/${bookId}/highlights/${highlightId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete highlight");
      return highlightId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", bookId, "highlights"] });
    },
  });

  // Restore highlight mutation (undo)
  const restoreMutation = useMutation({
    mutationFn: async (highlightId: string) => {
      const res = await fetch(`/api/books/${bookId}/highlights/${highlightId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore highlight");
      return res.json() as Promise<Highlight>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", bookId, "highlights"] });
    },
  });

  return {
    highlights,
    isLoading,
    refetch,
    createHighlight: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateHighlight: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteHighlight: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    restoreHighlight: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
  };
}
