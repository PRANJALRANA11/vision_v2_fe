
interface TechBadgeProps {
  name: string;
}

export const TechBadge = ({ name }: TechBadgeProps) => {
  return (
    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
      {name}
    </span>
  );
};
