import { Users } from "lucide-react";

const formatAgo = (iso: string) => {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
};

interface Props {
  reportedAt?: string | null;
}

const CommunityReportBadge = ({ reportedAt }: Props) => {
  if (!reportedAt) return null;
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
      <Users className="w-3 h-3" />
      <span>Reportado por la comunidad {formatAgo(reportedAt)}</span>
    </div>
  );
};

export default CommunityReportBadge;
