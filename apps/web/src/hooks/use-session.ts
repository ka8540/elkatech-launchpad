import { useQuery } from "@tanstack/react-query";
import type { AuthUser } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";

type SessionResponse = {
  user: AuthUser | null;
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => apiRequest<SessionResponse>("/api/auth/me"),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
