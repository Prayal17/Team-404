import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { Examination, Module, Cohort, Room } from '../types';

export const ExaminationsPage: React.FC = () => {
  const [exams, setExams] = useState<Examination[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    moduleId: '',
    cohortId: '',
    studentCount: 85,
    date: '2026-10-15',
    startTime: '10:00',
    duration: 2
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [resExams, resMods, resCohorts, resRooms] = await Promise.all([
        api.getExaminations(),
        api.getModules(),
        api.getCohorts(),
        api.getRooms()
      ]);
      setExams(resExams.data.data);
      setModules(resMods.data.data);
      setCohorts(resCohorts.data.data);
      setRooms(resRooms.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateSchedule = async () => {
    try {
      setIsGenerating(true);
      await api.generateExamSchedule();
      setNotice('✓ Exam rooms automatically allocated successfully based on capacity requirements!');
      await loadData();
    } catch (e: any) {
      setNotice('Failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExamination(formData);
      setIsModalOpen(false);
      setNotice('✓ Examination created and venues automatically allocated!');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this examination?')) {
      await api.deleteExamination(id);
      await loadData();
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Examination Planning & Multi-Venue Allocation
          </h2>
          <p className="text-xs text-slate-500">
            Intelligent exam venue scheduling with automatic capacity splitting across rooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Exam</span>
          </button>

          <button
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Allocating Venues...</span>
              </>
            ) : (
              <span>GENERATE EXAM SCHEDULE</span>
            )}
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-md">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-200 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Examination Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Module Code & Name</th>
                <th className="py-3.5 px-4">Cohort</th>
                <th className="py-3.5 px-4 text-center">Enrolled Students</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Allocated Venues (Capacity Distribution)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No examinations configured. Click "Add Exam" to begin.
                  </td>
                </tr>
              ) : (
                exams.map((exam) => {
                  const totalAllocated = exam.allocations.reduce((acc, a) => acc + a.allocatedStudents, 0);
                  const isFull = totalAllocated >= exam.studentCount;

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <span className="font-mono text-indigo-600 mr-2">{exam.module.code}</span>
                        <span>{exam.module.name}</span>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-700">{exam.cohort.name}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-900 font-mono">
                        {exam.studentCount}
                      </td>
                      <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exam.date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{exam.startTime} ({exam.duration}h)</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {exam.allocations.length === 0 ? (
                          <span className="text-slate-400 italic">No rooms allocated yet</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {exam.allocations.map((alloc) => (
                              <span
                                key={alloc.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-md text-[11px] font-semibold"
                              >
                                <Building2 className="w-3 h-3 text-indigo-600" />
                                <span>{alloc.room.name} → </span>
                                <span className="font-bold text-indigo-700">{alloc.allocatedStudents} seats</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-1 font-medium">
                          Allocated: {totalAllocated} / {exam.studentCount} students
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ' + (isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}
                        >
                          {isFull ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {isFull ? 'ALLOCATED' : 'PARTIAL'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Examination</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Module</label>
                <select
                  required
                  value={formData.moduleId}
                  onChange={(e) => {
                    const modId = e.target.value;
                    const mod = modules.find(m => m.id === modId);
                    const defaultCohort = mod?.cohorts && mod.cohorts.length > 0 ? mod.cohorts[0] : null;
                    setFormData({
                      ...formData,
                      moduleId: modId,
                      cohortId: defaultCohort ? defaultCohort.id : '',
                      studentCount: defaultCohort ? defaultCohort.studentCount : formData.studentCount
                    });
                  }}
                  className="w-full rounded-lg border-slate-300 p-2 border bg-white"
                >
                  <option value="">-- Select Module --</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} {m.cohorts && m.cohorts.length > 0 ? `(${m.cohorts.map(c => c.name).join(', ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cohort
                </label>
                <select
                  required
                  value={formData.cohortId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const coh = cohorts.find(c => c.id === cId);
                    setFormData({
                      ...formData,
                      cohortId: cId,
                      studentCount: coh?.studentCount || formData.studentCount
                    });
                  }}
                  className="w-full rounded-lg border-slate-300 p-2 border bg-white"
                >
                  <option value="">-- Select Cohort --</option>
                  {(() => {
                    const selectedModule = modules.find(m => m.id === formData.moduleId);
                    const selectableCohorts = selectedModule?.cohorts && selectedModule.cohorts.length > 0
                      ? selectedModule.cohorts
                      : cohorts;
                    return selectableCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.studentCount} students)
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Count</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.studentCount}
                    onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value, 10) })}
                    className="w-full rounded-lg border-slate-300 p-2 border"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) })}
                    className="w-full rounded-lg border-slate-300 p-2 border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border-slate-300 p-2 border"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full rounded-lg border-slate-300 p-2 border"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Create & Auto-Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
