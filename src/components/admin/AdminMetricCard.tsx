import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AdminMetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
}

export function AdminMetricCard({ title, value, icon: Icon, description }: AdminMetricCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold font-display mt-0.5">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
