import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Edit2, Calendar, X } from 'lucide-react';
import { api } from '../services/api';
import { Lecturer } from '../types';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Computing & Informatics',
    availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    maxDailyHours: 6
  });

  const loadData = async () => {
    const res = await api.getLecturers();
    setLecturers(res.data.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const toggleDay = (day: string) => {
    if (formData.availableDays.includes(day)) {
      setFormData({ ...formData, availableDays: formData.availableDays.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, availableDays: [...formData.availableDays, day] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        department: formData.department,
        availability: JSON.stringify(formData.availableDays),
        maxDailyHours: formData.maxDailyHours
      };
      if (editingLecturer) {
        await api.updateLecturer(editingLecturer.id, payload as any);
      } else {
        await api.createLecturer(payload as any);
      }
      setIsModalOpen(false);
      setEditingLecturer(null);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete lecturer? Modules taught by them will lose lecturer assignment.')) {
      await api.deleteLecturer(id);
      await loadData();
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Lecturer Faculty Management
          </h2>
          <p className="text-xs text-slate-500">
            Manage teaching faculty, departmental affiliations, and day-to-day teaching availability constraints.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingLecturer(null);
            setFormData({ name: '', email: '', department: 'Computing & Informatics', availableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], maxDailyHours: 6 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lecturer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lecturers.map((lec) => {
          let days: string[] = [];
          if (lec.availability === 'ALL') {
            days = daysList;
          } else {
            try { days = JSON.parse(lec.availability); } catch { days = daysList; }
          }

          return (
            <div key={lec.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{lec.name}</h4>
                  <p className="text-xs text-indigo-600 font-medium">{lec.email}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{lec.department}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingLecturer(lec);
                      setFormData({
                        name: lec.name,
                        email: lec.email,
                        department: lec.department,
                        availableDays: days,
                        maxDailyHours: lec.maxDailyHours || 6
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(lec.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3 h-3" /> Available Days ({days.length}/5)
                </span>
                <div className="flex flex-wrap gap-1">
                  {daysList.map(d => {
                    const isAvail = days.includes(d);
                    return (
                      <span
                        key={d}
                        className={'px-2 py-0.5 rounded text-[10px] font-bold ' + (isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through')}
                      >
                        {d.slice(0, 3)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{editingLecturer ? 'Edit Lecturer' : 'Add Lecturer'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg p-2" placeholder="e.g. Dr. Jane Doe" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border rounded-lg p-2" placeholder="e.g. jane.doe@iap.edu" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full border rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Availability Profile (Days)</label>
                <div className="flex flex-wrap gap-2">
                  {daysList.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ' + (formData.availableDays.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200')}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">Save Lecturer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
