import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Priority } from "./TodoInput";

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  deadline: Date | null;
  priority: Priority;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  1: { label: "Prioritas 1", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700" },
  2: { label: "Prioritas 2", color: "bg-success/10 text-success border-success/20" },
  3: { label: "Prioritas 3", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20" },
  4: { label: "Prioritas 4", color: "bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20" },
  5: { label: "Prioritas 5", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const TodoItem = ({ id, text, completed, deadline, priority, onToggle, onDelete }: TodoItemProps) => {
  const daysUntilDeadline = deadline ? differenceInDays(deadline, new Date()) : null;
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 2 && daysUntilDeadline >= 0;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 p-4 bg-card rounded-lg border transition-all duration-300 hover:shadow-md",
        completed && "opacity-60",
        isOverdue && !completed && "border-destructive/50 bg-destructive/5",
        isUrgent && !completed && "border-orange-500/50 bg-orange-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={completed}
          onCheckedChange={() => onToggle(id)}
          className="mt-1 data-[state=checked]:bg-success data-[state=checked]:border-success"
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={id}
            className={cn(
              "cursor-pointer text-card-foreground transition-all duration-200 block",
              completed && "line-through text-muted-foreground"
            )}
          >
            {text}
          </label>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className={priorityConfig[priority].color}>
              {priorityConfig[priority].label}
            </Badge>
            
            {deadline && (
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && !completed && "bg-destructive/10 text-destructive border-destructive/20",
                  isUrgent && !completed && "bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20"
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(deadline, "d MMM yyyy")}
                {!completed && daysUntilDeadline !== null && (
                  <span className="text-xs">
                    ({daysUntilDeadline === 0 ? "Hari ini" : 
                      daysUntilDeadline < 0 ? `${Math.abs(daysUntilDeadline)} hari lewat` :
                      `${daysUntilDeadline} hari lagi`})
                  </span>
                )}
              </Badge>
            )}
            
            {isOverdue && !completed && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Terlambat
              </Badge>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
