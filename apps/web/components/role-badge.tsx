import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  coach: "Coach",
  student: "Élève",
  user: "Autonome",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="secondary" className="bg-primary/15 text-primary">
      {ROLE_LABEL[role] ?? role}
    </Badge>
  );
}
