import { useState, useEffect } from "react";
import { TodoInput, Difficulty } from "@/components/TodoInput";
import { TodoItem } from "@/components/TodoItem";
import { TodoFilter, FilterType } from "@/components/TodoFilter";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download, Play } from "lucide-react";
import { toast } from "sonner";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  deadlineHours: number;
  durationHours: number;
  difficulty: Difficulty;
  createdAt: number;
}

const Index = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem("todos");
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    // Migrasi data lama ke format baru
    return parsed.map((todo: any) => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
      deadlineHours: todo.deadlineHours || 24,
      durationHours: todo.durationHours || 1,
      difficulty: todo.difficulty || todo.priority || 3,
      createdAt: todo.createdAt || Date.now(),
    }));
  });
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text: string, deadlineHours: number, durationHours: number, difficulty: Difficulty) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      deadlineHours,
      durationHours,
      difficulty,
      createdAt: Date.now(),
    };
    setTodos([newTodo, ...todos]);
  };

  const runSAnnealing = async () => {
    try {
      // Transform data for Python script
      const pythonTasks = todos.map(todo => ({
        name: todo.text,
        deadline: todo.deadlineHours,
        duration: todo.durationHours,
        difficulty: todo.difficulty
      }));

      // 1. Save tasks to server
      const saveResponse = await fetch('http://localhost:3001/api/save-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythonTasks),
      });

      if (!saveResponse.ok) throw new Error('Gagal menyimpan data task');

      // 2. Run Python script
      const runResponse = await fetch('http://localhost:3001/api/run-sa', {
        method: 'POST',
      });

      if (!runResponse.ok) throw new Error('Gagal menjalankan Python script');

      toast.success("Simulated Annealing berjalan!", {
        description: "Aplikasi Python telah dibuka."
      });
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan", {
        description: error instanceof Error ? error.message : "Gagal menghubungkan ke server"
      });
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const filteredTodos = todos
    .filter((todo) => {
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      return true;
    })
    .sort((a, b) => {
      // Sort by difficulty first (5 = highest, 1 = lowest)
      if (a.difficulty !== b.difficulty) {
        return b.difficulty - a.difficulty;
      }
      // Then by time remaining (earlier deadlines first)
      const aTimeRemaining = (a.createdAt + (a.deadlineHours * 60 * 60 * 1000)) - Date.now();
      const bTimeRemaining = (b.createdAt + (b.deadlineHours * 60 * 60 * 1000)) - Date.now();
      return aTimeRemaining - bTimeRemaining;
    });

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-2xl shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
              My Tasks
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Kelola task harian Anda dengan mudah dan efisien
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 md:p-8 space-y-6 backdrop-blur-sm">
          <TodoInput onAdd={addTodo} />

          <div className="flex items-center justify-between flex-wrap gap-4">
            <TodoFilter currentFilter={filter} onFilterChange={setFilter} counts={counts} />
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {counts.active} task tersisa
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={runSAnnealing}
                className="flex items-center gap-2 rounded-xl shadow-sm hover:shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={todos.length === 0}
              >
                <Play className="h-4 w-4" />
                SAnneal
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">
                  {filter === "completed"
                    ? "Belum ada task yang selesai"
                    : filter === "active"
                      ? "Tidak ada task aktif"
                      : "Belum ada task. Tambahkan task pertama Anda!"}
                </p>
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  id={todo.id}
                  text={todo.text}
                  completed={todo.completed}
                  deadlineHours={todo.deadlineHours}
                  durationHours={todo.durationHours}
                  difficulty={todo.difficulty}
                  createdAt={todo.createdAt}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-muted-foreground space-y-1">
          <p>Data tersimpan otomatis di browser Anda</p>
          <p className="text-xs">Klik SAnneal untuk menjalankan optimasi dengan Python</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
