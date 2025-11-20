import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TodoItem = ({ id, text, completed, onToggle, onDelete }: TodoItemProps) => {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-4 bg-card rounded-lg border border-border",
        "transition-all duration-300 hover:shadow-md",
        completed && "opacity-60"
      )}
    >
      <Checkbox
        id={id}
        checked={completed}
        onCheckedChange={() => onToggle(id)}
        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex-1 cursor-pointer text-card-foreground transition-all duration-200",
          completed && "line-through text-muted-foreground"
        )}
      >
        {text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
