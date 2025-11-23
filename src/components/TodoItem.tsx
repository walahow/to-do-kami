import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Clock, Timer, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Difficulty } from "./TodoInput";

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  deadlineHours: number;
  durationHours: number;
  difficulty: Difficulty;
  createdAt: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const difficultyConfig: Record<Difficulty, { label: string; color: string }> = {
  1: { label: "Level 1", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700" },
  2: { label: "Level 2", color: "bg-success/10 text-success border-success/20" },
  3: { label: "Level 3", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20" },
  4: { label: "Level 4", color: "bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20" },
  5: { label: "Level 5", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const TodoItem = ({ id, text, completed, deadlineHours, durationHours, difficulty, createdAt, onToggle, onDelete }: TodoItemProps) => {
  // Fallback untuk data lama atau invalid
  const validDifficulty: Difficulty = (difficulty && difficulty >= 1 && difficulty <= 5) ? difficulty : 3;
  
  const deadlineTime = createdAt + (deadlineHours * 60 * 60 * 1000);
  const hoursRemaining = (deadlineTime - Date.now()) / (60 * 60 * 1000);
  const isOverdue = hoursRemaining < 0;
  const isUrgent = hoursRemaining > 0 && hoursRemaining <= 6;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200",
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
            <Badge variant="outline" className={difficultyConfig[validDifficulty].color}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {difficultyConfig[validDifficulty].label}
            </Badge>
            
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1",
                isOverdue && !completed && "bg-destructive/10 text-destructive border-destructive/20",
                isUrgent && !completed && "bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20"
              )}
            >
              <Clock className="h-3 w-3" />
              {!completed && (
                <span className="text-xs">
                  {isOverdue 
                    ? `${Math.abs(hoursRemaining).toFixed(1)} jam lewat` 
                    : `${hoursRemaining.toFixed(1)} jam lagi`}
                </span>
              )}
              {completed && <span className="text-xs">{deadlineHours} jam</span>}
            </Badge>

            <Badge variant="outline" className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              <span className="text-xs">{durationHours} jam</span>
            </Badge>
            
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
