
import { Card, CardContent } from "@/components/ui/card";

interface ProcessStepProps {
  step: number;
  title: string;
  description: string;
}

export const ProcessStep = ({ step, title, description }: ProcessStepProps) => {
  return (
    <Card className="h-full text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="gradient-bg rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{step}</span>
        </div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};
