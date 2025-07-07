
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 hover:border-primary/20">
      <CardContent className="p-8 text-center">
        <div className="gradient-bg rounded-full p-4 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-4 text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};
