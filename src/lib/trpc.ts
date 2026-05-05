// Simplified TRPC client for landing page
// @trpc/client is imported for type compatibility only
export const trpc = {
  useUtils: () => ({}),
  auth: {
    me: {
      useQuery: () => ({ data: null, isLoading: false, error: null, refetch: () => {} }),
    },
    logout: {
      useMutation: () => ({ mutateAsync: async () => {}, isPending: false }),
    },
  },
};
