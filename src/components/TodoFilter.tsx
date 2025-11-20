import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilterType = "all" | "active" | "completed";

interface TodoFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: {
    all: number;
    active: number;
    completed: number;
  };
}

export const TodoFilter = ({ currentFilter, onFilterChange, counts }: TodoFilterProps) => {
  const filters: { value: FilterType; label: string; count: number }[] = [
    { value: "all", label: "Semua", count: counts.all },
    { value: "active", label: "Aktif", count: counts.active },
    { value: "completed", label: "Selesai", count: counts.completed },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={currentFilter === filter.value ? "default" : "outline"}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "transition-all duration-200 rounded-xl",
            currentFilter === filter.value
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card hover:bg-secondary shadow-sm"
          )}
        >
          {filter.label} ({filter.count})
        </Button>
      ))}
    </div>
  );
};
