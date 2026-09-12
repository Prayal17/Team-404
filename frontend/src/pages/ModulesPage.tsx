import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Search, X, Check, Clock, User, Layers, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { Module, Lecturer, Cohort, SessionType, RoomType } from '../types';

interface ComponentFormState {
  enabled: boolean;
  type: SessionType;
  durationHours: number; // e.g. 1.5, 1.0, 2.0
  requiredRoomType: RoomType;
  lecturerId: string;
}

export const ModulesPage: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cohortIds, setCohortIds] = useState<string[]>([]);

  const [components, setComponents] = useState<{
    LECTURE: ComponentFormState;
    TUTORIAL: ComponentFormState;
    WORKSHOP: ComponentFormState;
  }>({
    LECTURE: {
      enabled: true,
      type: 'LECTURE',
      durationHours: 1.5,
      requiredRoomType: 'CLASSROOM',
      lecturerId: ''
    },
    TUTORIAL: {
      enabled: true,
      type: 'TUTORIAL',
      durationHours: 1.0,
      requiredRoomType: 'CLASSROOM',
      lecturerId: ''
    },
    WORKSHOP: {
      enabled: true,
      type: 'WORKSHOP',
      durationHours: 2.0,
      requiredRoomType: 'COMPUTER_LAB',
      lecturerId: ''
    }
  });

  const loadData = async () => {
    const [resMods, resLecs, resCohs] = await Promise.all([
      api.getModules(),
      api.getLecturers(),
      api.getCohorts()
    ]);
    setModules(resMods.data.data);
    setLecturers(resLecs.data.data);
    setCohorts(resCohs.data.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingModule(null);
    setCode('');
    setName('');
    setDescription('');
    setCohortIds(cohorts[0] ? [cohorts[0].id] : []);
    setComponents({
      LECTURE: {
        enabled: true,
        type: 'LECTURE',
        durationHours: 1.5,
        requiredRoomType: 'CLASSROOM',
        lecturerId: lecturers[0]?.id || ''
      },
      TUTORIAL: {
        enabled: true,
        type: 'TUTORIAL',
        durationHours: 1.0,
        requiredRoomType: 'CLASSROOM',
        lecturerId: lecturers[1]?.id || lecturers[0]?.id || ''
      },
      WORKSHOP: {
        enabled: true,
        type: 'WORKSHOP',
        durationHours: 2.0,
        requiredRoomType: 'COMPUTER_LAB',
        lecturerId: lecturers[2]?.id || lecturers[0]?.id || ''
      }
    });
    setIsModalOpen(true);
  };

  const openEditModal = (mod: Module) => {
    setEditingModule(mod);
    setCode(mod.code);
    setName(mod.name);
    setDescription(mod.description || '');
    setCohortIds(mod.cohorts?.map(c => c.id) || []);

    const lecComp = mod.components.find(c => c.type === 'LECTURE');
    const tutComp = mod.components.find(c => c.type === 'TUTORIAL');
    const wrkComp = mod.components.find(c => c.type === 'WORKSHOP');

    setComponents({
      LECTURE: {
        enabled: !!lecComp,
        type: 'LECTURE',
        durationHours: lecComp ? lecComp.durationMinutes / 60 : 1.5,
        requiredRoomType: (lecComp?.requiredRoomType as RoomType) || 'CLASSROOM',
        lecturerId: lecComp?.lecturerId || lecturers[0]?.id || ''
      },
      TUTORIAL: {
        enabled: !!tutComp,
        type: 'TUTORIAL',
        durationHours: tutComp ? tutComp.durationMinutes / 60 : 1.0,
        requiredRoomType: (tutComp?.requiredRoomType as RoomType) || 'CLASSROOM',
        lecturerId: tutComp?.lecturerId || lecturers[1]?.id || lecturers[0]?.id || ''
      },
      WORKSHOP: {
        enabled: !!wrkComp,
        type: 'WORKSHOP',
        durationHours: wrkComp ? wrkComp.durationMinutes / 60 : 2.0,
        requiredRoomType: (wrkComp?.requiredRoomType as RoomType) || 'COMPUTER_LAB',
        lecturerId: wrkComp?.lecturerId || lecturers[2]?.id || lecturers[0]?.id || ''
      }
    });

    setIsModalOpen(true);
  };

  // Dynamic total weekly teaching hours calculation
  const totalWeeklyHours = Object.values(components)
    .filter(c => c.enabled)
    .reduce((acc, c) => acc + (parseFloat(String(c.durationHours)) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cohortIds || cohortIds.length === 0) {
      alert('Please select at least one enrolled cohort.');
      return;
    }

    const activeComponents = Object.values(components)
      .filter(c => c.enabled)
      .map(c => {
        const hours = parseFloat(String(c.durationHours));
        return {
          type: c.type,
          durationMinutes: Math.round(hours * 60),
          requiredRoomType: c.requiredRoomType,
          lecturerId: c.lecturerId
        };
      });

    if (activeComponents.length === 0) {
      alert('Please enable at least one teaching component (Lecture, Tutorial, or Workshop).');
      return;
    }

    for (const comp of activeComponents) {
      if (!comp.lecturerId) {
        alert(`Please select an assigned lecturer for the ${comp.type} component.`);
        return;
      }
      if (!comp.durationMinutes || comp.durationMinutes <= 0) {
        alert(`Duration for ${comp.type} must be greater than 0 hours.`);
        return;
      }
    }

    try {
      const payload = {
        code,
        name,
        description,
        cohortIds,
        components: activeComponents
      };

      if (editingModule) {
        await api.updateModule(editingModule.id, payload as any);
      } else {
        await api.createModule(payload as any);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this module? All associated components and sessions will be removed.')) {
      await api.deleteModule(id);
      await loadData();
    }
  };

  const filtered = modules.filter(
    m =>
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Module Management
          </h2>
          <p className="text-xs text-slate-500">
            Configure academic modules with distinct teaching components (Lecture, Tutorial, Workshop) and independent lecturer assignments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Module</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search modules by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs text-slate-800 placeholder-slate-400 outline-none"
        />
      </div>

      {/* Modules Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white uppercase text-[11px] tracking-wider font-bold">
            <tr>
              <th className="py-3.5 px-4">Code</th>
              <th className="py-3.5 px-4">Module Name</th>
              <th className="py-3.5 px-4">Cohorts</th>
              <th className="py-3.5 px-4">Weekly Teaching Components & Lecturers</th>
              <th className="py-3.5 px-4 text-center">Total Hours</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((m) => {
              const totalHours = (m.components || []).reduce((acc, c) => acc + c.durationMinutes / 60, 0);

              return (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 font-mono font-bold text-indigo-600 align-top">
                    {m.code}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-900 align-top">
                    <div>{m.name}</div>
                    {m.description && <div className="text-[11px] text-slate-400 font-normal mt-0.5">{m.description}</div>}
                  </td>
                  <td className="py-4 px-4 text-slate-700 align-top">
                    <div className="flex flex-wrap gap-1">
                      {m.cohorts && m.cohorts.length > 0 ? (
                        m.cohorts.map(c => (
                          <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {c.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">No cohorts</span>
                      )}
                    </div>
                    {m.cohorts && m.cohorts.length > 0 && (
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        {m.cohorts.reduce((sum, c) => sum + c.studentCount, 0)} total students
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-2">
                      {m.components.map((comp) => {
                        const isLec = comp.type === 'LECTURE';
                        const isTut = comp.type === 'TUTORIAL';
                        const isWrk = comp.type === 'WORKSHOP';

                        let badgeColor = 'bg-slate-50 border-slate-200 text-slate-700';
                        if (isLec) badgeColor = 'bg-indigo-50 border-indigo-200 text-indigo-900';
                        if (isTut) badgeColor = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                        if (isWrk) badgeColor = 'bg-violet-50 border-violet-200 text-violet-900';

                        const hours = comp.durationMinutes / 60;
                        const formattedH = hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;

                        return (
                          <div
                            key={comp.id || comp.type}
                            className={'p-2 rounded-lg border text-[11px] flex flex-col gap-0.5 ' + badgeColor}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold uppercase tracking-wider text-[10px]">{comp.type}</span>
                              <span className="font-mono font-semibold text-[10px]">{formattedH} ({comp.durationMinutes}m)</span>
                            </div>
                            <div className="flex items-center gap-1 font-medium mt-0.5 text-slate-800">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{comp.lecturer?.name || 'Unassigned'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Venue: <span className="font-semibold">{comp.requiredRoomType}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-mono font-bold text-slate-900 align-top">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md">
                      {totalHours.toFixed(1)}h / wk
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right space-x-2 align-top">
                    <button
                      onClick={() => openEditModal(m)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Module Modal with Weekly Teaching Structure */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingModule ? 'Edit Academic Module' : 'Create Academic Module'}
                </h3>
                <p className="text-xs text-slate-400">Configure multi-component weekly structure & separate lecturers</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              {/* Basic Module Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Module Code</label>
                    <input
                      required
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      className="w-full border rounded-lg p-2 uppercase font-mono"
                      placeholder="e.g. CS501"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Module Title</label>
                    <input
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full border rounded-lg p-2"
                      placeholder="e.g. Web Application Development"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enrolled Cohorts ({cohortIds.length} selected)
                  </label>
                  <div className="border rounded-lg p-2 bg-slate-50/80 max-h-36 overflow-y-auto space-y-1.5">
                    {cohorts.map(c => {
                      const isChecked = cohortIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                            isChecked ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium' : 'hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setCohortIds([...cohortIds, c.id]);
                                } else {
                                  setCohortIds(cohortIds.filter(id => id !== c.id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>{c.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{c.studentCount} students</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Weekly Teaching Structure Header & Dynamic Total */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Weekly Teaching Structure (Independent Component Lecturers)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Configure duration and select separate lecturers for each component type.
                    </p>
                  </div>
                  <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-bold font-mono">
                    Total: {totalWeeklyHours.toFixed(1)} hrs/wk
                  </div>
                </div>

                {/* 3 Component Cards */}
                <div className="space-y-3">
                  {(['LECTURE', 'TUTORIAL', 'WORKSHOP'] as SessionType[]).map((type) => {
                    const comp = components[type];
                    const isLecture = type === 'LECTURE';
                    const isTutorial = type === 'TUTORIAL';
                    const isWorkshop = type === 'WORKSHOP';

                    let headerBg = 'bg-indigo-50/80 border-indigo-200 text-indigo-950';
                    if (isTutorial) headerBg = 'bg-emerald-50/80 border-emerald-200 text-emerald-950';
                    if (isWorkshop) headerBg = 'bg-violet-50/80 border-violet-200 text-violet-950';

                    return (
                      <div
                        key={type}
                        className={'p-4 rounded-xl border transition-all ' + (comp.enabled ? headerBg : 'bg-slate-50 border-slate-200 opacity-60')}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={'enable-' + type}
                              checked={comp.enabled}
                              onChange={e =>
                                setComponents({
                                  ...components,
                                  [type]: { ...comp, enabled: e.target.checked }
                                })
                              }
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor={'enable-' + type} className="font-bold text-sm cursor-pointer select-none">
                              {type} {comp.enabled ? '' : '(Disabled)'}
                            </label>
                          </div>
                          {comp.enabled && (
                            <span className="text-[11px] font-mono text-slate-500 font-semibold">
                              {Math.round((parseFloat(String(comp.durationHours)) || 0) * 60)} minutes
                            </span>
                          )}
                        </div>

                        {comp.enabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Duration Decimal Input */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Duration (Hours)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="8"
                                required
                                value={comp.durationHours}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setComponents({
                                    ...components,
                                    [type]: { ...comp, durationHours: val }
                                  });
                                }}
                                className="w-full border rounded-lg p-2 bg-white font-mono"
                                placeholder="e.g. 1.5"
                              />
                            </div>

                            {/* Assigned Component Lecturer */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Component Lecturer
                              </label>
                              <select
                                required
                                value={comp.lecturerId}
                                onChange={e =>
                                  setComponents({
                                    ...components,
                                    [type]: { ...comp, lecturerId: e.target.value }
                                  })
                                }
                                className="w-full border rounded-lg p-2 bg-white text-xs"
                              >
                                <option value="">-- Select Lecturer --</option>
                                {lecturers.map(l => (
                                  <option key={l.id} value={l.id}>
                                    {l.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Required Room Type */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Room Requirement
                              </label>
                              <select
                                value={comp.requiredRoomType}
                                onChange={e =>
                                  setComponents({
                                    ...components,
                                    [type]: { ...comp, requiredRoomType: e.target.value as RoomType }
                                  })
                                }
                                className="w-full border rounded-lg p-2 bg-white text-xs"
                              >
                                <option value="ANY">Any Room</option>
                                <option value="CLASSROOM">Classroom</option>
                                <option value="COMPUTER_LAB">Computer Lab</option>
                                <option value="LECTURE_HALL">Lecture Hall</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  Save Module Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
