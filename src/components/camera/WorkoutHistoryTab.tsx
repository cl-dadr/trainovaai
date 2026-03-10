import { useState } from "react";
import { Clock, Pencil, Trash2, Check, X } from "lucide-react";
import { EXERCISE_NAMES, type ExerciseType } from "@/lib/exerciseDetection";
import { type SessionRecord } from "./types";

interface WorkoutHistoryTabProps {
  pastSessions: SessionRecord[];
  onEdit: (id: string, reps: number, formScore: number) => void;
  onDelete: (id: string) => void;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const WorkoutHistoryTab = ({ pastSessions, onEdit, onDelete }: WorkoutHistoryTabProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReps, setEditReps] = useState(0);
  const [editForm, setEditForm] = useState(0);

  if (pastSessions.length === 0) {
    return (
      <div className="relative z-10 glass-card p-8 text-center">
        <Clock className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No sessions yet</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-2">
      <p className="text-xs text-muted-foreground mb-1">Tap ✏️ to edit or 🗑️ to delete • Synced in real-time</p>
      {pastSessions.map(s => (
        <div key={s.id || s.created_at} className="glass-card p-3">
          {editingId === s.id ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground">{EXERCISE_NAMES[s.exercise_type as ExerciseType] || s.exercise_type}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Reps</label>
                  <input type="number" value={editReps} onChange={e => setEditReps(Number(e.target.value))}
                    className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs text-foreground border border-border/50" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Form %</label>
                  <input type="number" value={editForm} onChange={e => setEditForm(Number(e.target.value))} min={0} max={100}
                    className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs text-foreground border border-border/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { onEdit(s.id!, editReps, editForm); setEditingId(null); }}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1"><Check className="h-3 w-3" /> Save</button>
                <button onClick={() => setEditingId(null)}
                  className="flex-1 bg-secondary text-foreground rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1"><X className="h-3 w-3" /> Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">{EXERCISE_NAMES[s.exercise_type as ExerciseType] || s.exercise_type}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()} • {s.duration_seconds ? formatTime(s.duration_seconds) : "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right"><p className="text-sm font-bold text-primary">{s.reps}</p><p className="text-[8px] text-muted-foreground">reps</p></div>
                <div className="text-right"><p className="text-sm font-bold text-neon-orange">{Math.round(s.calories_burned || 0)}</p><p className="text-[8px] text-muted-foreground">kcal</p></div>
                <div className="text-right"><p className={`text-sm font-bold ${(s.form_score || 0) >= 85 ? "text-primary" : "text-neon-orange"}`}>{s.form_score || 0}%</p><p className="text-[8px] text-muted-foreground">form</p></div>
                <div className="flex flex-col gap-1 ml-1">
                  <button onClick={() => { setEditingId(s.id!); setEditReps(s.reps); setEditForm(s.form_score || 0); }} className="p-1 rounded bg-secondary"><Pencil className="h-3 w-3 text-neon-cyan" /></button>
                  <button onClick={() => onDelete(s.id!)} className="p-1 rounded bg-secondary"><Trash2 className="h-3 w-3 text-destructive" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkoutHistoryTab;
