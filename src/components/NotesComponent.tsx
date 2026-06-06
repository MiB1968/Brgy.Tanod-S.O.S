import React, { useState, useEffect } from 'react';
import { notesService, Note } from '../services/notesService';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NotesComponent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const fetchedNotes = await notesService.getNotes();
      setNotes(fetchedNotes);
    } catch (err) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await notesService.addNote(newNote);
      setNewNote('');
      loadNotes();
      toast.success('Note added');
    } catch (err) {
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async (id: string | undefined) => {
    if (!id) return;
    try {
      await notesService.deleteNote(id);
      loadNotes();
      toast.success('Note deleted');
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-black italic tracking-tight font-display mb-8">
        Personal Notes
      </h1>
      
      <div className="glass-panel p-6 rounded-[32px] space-y-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note..."
          className="w-full bg-transparent border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30"
          rows={3}
        />
        <button
          onClick={handleAddNote}
          className="px-6 py-2 bg-emerald-500 rounded-xl text-black font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={16} /> Add Note
        </button>
      </div>

      {loading ? (
        <p className="text-white/40">Loading notes...</p>
      ) : (
        <div className="grid gap-4 mt-6">
          {notes.map(note => (
            <div key={note.id} className="glass-panel p-4 rounded-xl flex justify-between items-center">
              <p className="text-white">{note.content}</p>
              <button onClick={() => handleDeleteNote(note.id)} className="text-rose-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
