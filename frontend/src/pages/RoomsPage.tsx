import React, { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Edit2, CheckCircle2, XCircle, X } from 'lucide-react';
import { api } from '../services/api';
import { Room } from '../types';

export const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    building: 'Block A (Main)',
    capacity: 40,
    type: 'CLASSROOM',
    isAvailable: true
  });

  const loadData = async () => {
    const res = await api.getRooms();
    setRooms(res.data.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, formData as any);
      } else {
        await api.createRoom(formData as any);
      }
      setIsModalOpen(false);
      setEditingRoom(null);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete room?')) {
      await api.deleteRoom(id);
      await loadData();
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Classroom & Resource Management
          </h2>
          <p className="text-xs text-slate-500">
            Configure classrooms, computer labs, lecture halls, seat capacities, and availability statuses.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRoom(null);
            setFormData({ name: '', building: 'Block A (Main)', capacity: 40, type: 'CLASSROOM', isAvailable: true });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Room</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-base">{r.name}</h4>
                  <span className={'px-2 py-0.5 rounded text-[10px] font-bold ' + (r.type === 'COMPUTER_LAB' ? 'bg-indigo-100 text-indigo-800' : r.type === 'LECTURE_HALL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')}>
                    {r.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{r.building}</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingRoom(r);
                    setFormData({ name: r.name, building: r.building, capacity: r.capacity, type: r.type, isAvailable: r.isAvailable });
                    setIsModalOpen(true);
                  }}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(r.id)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Capacity</span>
                <p className="font-bold font-mono text-slate-900 text-sm mt-0.5">{r.capacity} seats</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
                <span className={'inline-flex items-center gap-1 font-bold text-[11px] mt-0.5 ' + (r.isAvailable ? 'text-emerald-700' : 'text-rose-700')}>
                  {r.isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {r.isAvailable ? 'Active' : 'Maintenance'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{editingRoom ? 'Edit Room' : 'Add Room'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room Name / Code</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg p-2 font-mono" placeholder="e.g. Lab 201" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Building Location</label>
                <input required value={formData.building} onChange={e => setFormData({ ...formData, building: e.target.value })} className="w-full border rounded-lg p-2" placeholder="e.g. Tech Center" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity (Seats)</label>
                  <input type="number" min={1} required value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) })} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room Type</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full border rounded-lg p-2">
                    <option value="CLASSROOM">Classroom</option>
                    <option value="COMPUTER_LAB">Computer Lab</option>
                    <option value="LECTURE_HALL">Lecture Hall</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isAvailable" checked={formData.isAvailable} onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="isAvailable" className="font-semibold text-slate-700">Room is Available for Scheduling</label>
              </div>

              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
