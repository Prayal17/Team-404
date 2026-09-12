import React, { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, Edit2, Users, X } from 'lucide-react';
import { api } from '../services/api';
import { Cohort } from '../types';

export const CohortsPage: React.FC = () => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    programme: 'BSc (Hons) Information Technology',
    studentCount: 45
  });

  const loadData = async () => {
    const res = await api.getCohorts();
    setCohorts(res.data.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCohort) {
        await api.updateCohort(editingCohort.id, formData);
      } else {
        await api.createCohort(formData);
      }
      setIsModalOpen(false);
      setEditingCohort(null);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete cohort?')) {
      await api.deleteCohort(id);
      await loadData();
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Student Cohort Management
          </h2>
          <p className="text-xs text-slate-500">
            Define student cohorts and headcounts. Student counts directly enforce room capacity constraints during scheduling.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCohort(null);
            setFormData({ name: '', programme: 'BSc (Hons) Information Technology', studentCount: 45 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Cohort</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cohorts.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-xs font-mono">
                  {c.name}
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{c.programme}</h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingCohort(c);
                    setFormData({ name: c.name, programme: c.programme, studentCount: c.studentCount });
                    setIsModalOpen(true);
                  }}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Enrolled Students</span>
              <span className="font-bold font-mono text-slate-900 text-sm">{c.studentCount}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{editingCohort ? 'Edit Cohort' : 'Add Cohort'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cohort Code / Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg p-2 font-mono uppercase" placeholder="e.g. BIT 2A" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academic Programme</label>
                <input required value={formData.programme} onChange={e => setFormData({ ...formData, programme: e.target.value })} className="w-full border rounded-lg p-2" placeholder="e.g. BSc (Hons) Computing" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Count</label>
                <input type="number" min={1} required value={formData.studentCount} onChange={e => setFormData({ ...formData, studentCount: parseInt(e.target.value, 10) })} className="w-full border rounded-lg p-2" />
              </div>

              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">Save Cohort</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
