import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, Plus, Check, SkipForward, X, CircleCheck, Play } from "lucide-react";
import { EXERCISE_NAMES, type ExerciseType } from "@/lib/exerciseDetection";
import { ALL_EXERCISES, type TodoItem } from "./types";

interface WorkoutTodoTabProps {
  todoList: TodoItem[];
  todoProgress: number;
  onAdd: (exercise: ExerciseType, reps: number) => void;
  onMarkDone: (index: number) => void;
  onSkip: (index: number) => void;
  onRemove: (index: number) => void;
  onReset: () => void;
  onSwitchToCamera: () => void;
}

const WorkoutTodoTab = ({ todoList, todoProgress, onAdd, onMarkDone, onSkip, onRemove, onReset, onSwitchToCamera }: WorkoutTodoTabProps) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newExercise, setNewExercise] = useState<ExerciseType>("pushup");
  const [newReps, setNewReps] = useState(10);

  return (
    <div className="relative z-10 space-y-3">
      <div className="glass-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Workout Plan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-primary">{todoProgress}%</span>
            {todoList.length > 0 && <button onClick={onReset} className="text-[9px] text-muted-foreground underline">Reset</button>}
          </div>
        </div>
        {todoList.length > 0 && (
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${todoProgress}%` }} transition={{ duration: 0.5 }} />
          </div>
        )}
      </div>

      {todoList.length === 0 && !showAdd && (
        <div className="glass-card p-6 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground mb-1">No exercises planned</p>
          <p className="text-[10px] text-muted-foreground/60 mb-3">Add exercises to create your workout plan</p>
          <button onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold">
            <Plus className="h-3 w-3 inline mr-1" /> Add Exercise
          </button>
        </div>
      )}

      {todoList.map((item, index) => {
        const exMeta = ALL_EXERCISES.find(e => e.type === item.exercise);
        return (
          <motion.div key={item.id || index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className={`glass-card p-3 border-l-3 ${
              item.status === "done" ? "border-l-primary/60 opacity-80" :
              item.status === "skipped" ? "border-l-neon-orange/60 opacity-60" : "border-l-border/50"
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{exMeta?.emoji || "🏋️"}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-bold ${item.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {EXERCISE_NAMES[item.exercise]}
                    </p>
                    {item.status === "done" && <CircleCheck className="h-3 w-3 text-primary" />}
                    {item.status === "skipped" && <SkipForward className="h-3 w-3 text-neon-orange" />}
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    Target: {item.targetReps} reps{item.actualReps !== undefined && item.actualReps > 0 && ` • Done: ${item.actualReps}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {item.status === "pending" && (
                  <>
                    <button onClick={() => onMarkDone(index)} className="p-1.5 rounded-lg bg-primary/20"><Check className="h-3 w-3 text-primary" /></button>
                    <button onClick={() => onSkip(index)} className="p-1.5 rounded-lg bg-neon-orange/20"><SkipForward className="h-3 w-3 text-neon-orange" /></button>
                  </>
                )}
                <button onClick={() => onRemove(index)} className="p-1.5 rounded-lg bg-secondary"><X className="h-3 w-3 text-muted-foreground" /></button>
              </div>
            </div>
          </motion.div>
        );
      })}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="glass-card p-3 overflow-hidden">
            <p className="text-xs font-bold text-foreground mb-2">Add Exercise</p>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {ALL_EXERCISES.map(ex => (
                <button key={ex.type} onClick={() => setNewExercise(ex.type)}
                  className={`p-1.5 rounded-lg text-center text-[9px] font-bold transition-all ${
                    newExercise === ex.type ? "bg-primary/20 border border-primary/50 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                  {ex.emoji} {ex.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-[9px] text-muted-foreground">Reps:</label>
              <input type="number" value={newReps} onChange={e => setNewReps(Number(e.target.value))} min={1}
                className="flex-1 bg-secondary rounded-lg px-2 py-1.5 text-xs text-foreground border border-border/50" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onAdd(newExercise, newReps); setShowAdd(false); }} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-xs font-bold"><Plus className="h-3 w-3 inline mr-1" /> Add</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-secondary text-foreground rounded-lg py-2 text-xs font-bold">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {todoList.length > 0 && !showAdd && (
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="flex-1 glass-card p-2.5 text-center text-[10px] font-bold text-primary">
            <Plus className="h-3 w-3 inline mr-0.5" /> Add More
          </button>
          <button onClick={onSwitchToCamera} className="flex-1 bg-primary text-primary-foreground rounded-xl p-2.5 text-center text-[10px] font-bold">
            <Play className="h-3 w-3 inline mr-0.5" /> Start Workout
          </button>
        </div>
      )}

      {todoList.length > 0 && (
        <div className="glass-card p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-sm font-bold text-primary">{todoList.filter(t => t.status === "done").length}</p><p className="text-[8px] text-muted-foreground">DONE</p></div>
            <div><p className="text-sm font-bold text-neon-orange">{todoList.filter(t => t.status === "skipped").length}</p><p className="text-[8px] text-muted-foreground">SKIPPED</p></div>
            <div><p className="text-sm font-bold text-muted-foreground">{todoList.filter(t => t.status === "pending").length}</p><p className="text-[8px] text-muted-foreground">PENDING</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutTodoTab;
