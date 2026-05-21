import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Skeleton } from "@/components/ui/skeleton";

const RequireAdmin = ({ children }: { children: JSX.Element }) => {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default RequireAdmin;
