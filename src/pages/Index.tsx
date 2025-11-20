import { useState, useEffect } from "react";
import { TodoInput, Priority } from "@/components/TodoInput";
import { TodoItem } from "@/components/TodoItem";
import { TodoFilter, FilterType } from "@/components/TodoFilter";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  deadline: Date | null;
  priority: Priority;
  createdAt: number;
}

const Index = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem("todos");
    return saved ? JSON.parse(saved) : [];
  });
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text: string, deadline: Date | null, priority: Priority) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      deadline,
      priority,
      createdAt: Date.now(),
    };
    setTodos([newTodo, ...todos]);
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      // Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Then by deadline (earlier deadlines first, null deadlines last)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      // Finally by creation date
      return b.createdAt - a.createdAt;
    });

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center justify-center gap-3 mb-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              My Tasks
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Kelola task harian Anda dengan mudah dan efisien
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
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
                onClick={exportToJSON}
                className="flex items-center gap-2"
                disabled={todos.length === 0}
              >
                <Download className="h-4 w-4" />
                Export JSON
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
                  deadline={todo.deadline ? new Date(todo.deadline) : null}
                  priority={todo.priority}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-muted-foreground space-y-1">
          <p>Data tersimpan otomatis di browser Anda</p>
          <p className="text-xs">Export ke JSON untuk digunakan dengan algoritma Simulated Annealing</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
