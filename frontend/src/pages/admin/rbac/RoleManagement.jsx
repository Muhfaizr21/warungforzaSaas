import React, { useState, useEffect } from 'react';
import {
    HiOutlineShieldCheck,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineLockClosed,
    HiOutlineChevronRight,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlinePencil
} from 'react-icons/hi';
import { API_BASE_URL } from '../../../config/api';
import { usePermission } from '../../../hooks/usePermission';
import { showToast } from '../../../utils/toast';

const RoleManagement = () => {
    const { hasPermission } = usePermission();
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editRoleName, setEditRoleName] = useState('');
    const [roleToEdit, setRoleToEdit] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [rolesRes, permsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/roles`, { headers }),
                fetch(`${API_BASE_URL}/admin/roles/permissions`, { headers })
            ]);

            if (rolesRes.ok && permsRes.ok) {
                const rolesData = await rolesRes.json();
                const permsData = await permsRes.json();

                setRoles(rolesData.data);
                setAllPermissions(permsData.data);

                // Keep selected role or default to first editable
                if (!selectedRole) {
                    const firstEditable = rolesData.data.find(r => r.slug !== 'super_admin');
                    setSelectedRole(firstEditable || rolesData.data[0]);
                } else {
                    // Refresh selected role data
                    const updatedSelected = rolesData.data.find(r => r.id === selectedRole.id);
                    if (updatedSelected) setSelectedRole(updatedSelected);
                }
            } else {
                setMessage({ type: 'error', text: 'Gagal memuat data kontrol akses' });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/admin/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newRoleName }) // Slug handled by backend
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Peran Baru Berhasil Dibuat' });
                setNewRoleName('');
                setShowCreateModal(false);
                fetchData();
            } else {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage = errorData.error || (res.status === 403 ? 'Akses Ditolak: Hanya Super Admin' : 'Gagal membuat peran');
                setMessage({ type: 'error', text: errorMessage });
            }
        } catch (error) {
            console.error('Create role error:', error);
            setMessage({ type: 'error', text: 'Kesalahan saat membuat peran: ' + error.message });
        }
    };

    const handleUpdateRole = async (e) => {
        e.preventDefault();
        if (!editRoleName.trim() || !roleToEdit) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/admin/roles/${roleToEdit.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: editRoleName })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Peran Berhasil Diperbarui' });
                setShowEditModal(false);
                fetchData();
            } else {
                const errorData = await res.json().catch(() => ({}));
                setMessage({ type: 'error', text: errorData.error || 'Gagal memperbarui peran' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Kesalahan: ' + error.message });
        }
    };

    const handleDeleteRole = async (role) => {
        if (role.slug === 'super_admin' || role.slug === 'user' || role.slug === 'admin') {
            showToast.warning('Peran sistem yang diproteksi tidak dapat dihapus');
            return;
        }

        if (!window.confirm(`Apakah Anda yakin ingin menghapus peran "${role.name}"? Ini akan menghapus semua pemetaan izin terkait.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/admin/roles/${role.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Peran Dihapus' });
                if (selectedRole?.id === role.id) setSelectedRole(null);
                fetchData();
            } else {
                const errorData = await res.json().catch(() => ({}));
                setMessage({ type: 'error', text: errorData.error || 'Gagal menghapus peran' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Kesalahan: ' + error.message });
        }
    };

    const handleTogglePermission = async (permId) => {
        if (!selectedRole || selectedRole.slug === 'super_admin') return;

        const currentPermIds = selectedRole.permissions.map(p => p.id);
        const isHas = currentPermIds.includes(permId);
        const newPermIds = isHas
            ? currentPermIds.filter(id => id !== permId)
            : [...currentPermIds, permId];

        // Optimistic Update
        const updatedRole = {
            ...selectedRole,
            permissions: allPermissions.filter(p => newPermIds.includes(p.id))
        };
        setSelectedRole(updatedRole);
        setRoles(roles.map(r => r.id === updatedRole.id ? updatedRole : r));

        // Sync with Backend
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/admin/roles/${selectedRole.id}/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ permission_ids: newPermIds })
            });
        } catch (error) {
            console.error('Failed to sync permission', error);
            setMessage({ type: 'error', text: 'Sync failed, refreshing...' });
            fetchData();
        }
    };
    const handleToggleCategory = async (category, perms) => {
        if (!selectedRole || selectedRole.slug === 'super_admin' || !hasPermission('role.manage')) return;

        const currentPermIds = selectedRole.permissions.map(p => p.id);
        const categoryPermIds = perms.map(p => p.id);

        // If all in category already selected, we unselect all. Otherwise, we select all missing ones.
        const isAllInCatSelected = categoryPermIds.every(id => currentPermIds.includes(id));

        let newPermIds;
        if (isAllInCatSelected) {
            newPermIds = currentPermIds.filter(id => !categoryPermIds.includes(id));
        } else {
            newPermIds = [...new Set([...currentPermIds, ...categoryPermIds])];
        }

        // Optimistic Update
        const updatedRole = {
            ...selectedRole,
            permissions: allPermissions.filter(p => newPermIds.includes(p.id))
        };
        setSelectedRole(updatedRole);
        setRoles(roles.map(r => r.id === updatedRole.id ? updatedRole : r));

        // Sync with Backend
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/admin/roles/${selectedRole.id}/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ permission_ids: newPermIds })
            });
        } catch (error) {
            console.error('Failed to sync category permission', error);
            setMessage({ type: 'error', text: 'Gagal sinkronisasi, memuat ulang...' });
            fetchData();
        }
    };

    // Group permissions by category (prefix before dot)
    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        const category = perm.slug.split('.')[0];
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
    }, {});

    if (loading) return <div className="p-20 text-center text-gray-500 font-mono animate-pulse">MEMUAT MATRIKS AKSES...</div>;

    return (
        <div className="p-8 space-y-6">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <HiOutlineShieldCheck className="text-emerald-400 w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-md">Kontrol Akses</h2>
                    </div>
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest ml-14">
                        Konfigurasi Otoritas & Izin Keamanan Sistem
                    </p>
                </div>
                {message.text && (
                    <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-4 shadow-lg backdrop-blur-md ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10' : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                        }`}>
                        {message.text}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Roles List */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Peran Sistem</h3>
                        {hasPermission('role.manage') && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="p-2 bg-white/5 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-all"
                            >
                                <HiOutlinePlus />
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {roles.filter(role => role.slug !== 'user').map(role => (
                            <div key={role.id} className="group/item relative">
                                <button
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center justify-between group-hover/item:shadow-lg ${selectedRole?.id === role.id
                                        ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                                        }`}
                                >
                                    <div className={`absolute top-0 left-0 bottom-0 w-1 transition-all duration-300 ${selectedRole?.id === role.id ? 'bg-emerald-500' : 'bg-transparent group-hover/item:bg-white/20'}`}></div>
                                    <div className="pl-3">
                                        <p className={`font-black uppercase tracking-widest text-sm transition-colors duration-300 ${selectedRole?.id === role.id ? 'text-emerald-400' : 'text-gray-400 group-hover/item:text-gray-200'}`}>
                                            {role.name}
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-mono mt-1.5 opacity-80">
                                            <span className="text-emerald-500/70">§</span> {role.slug} • {role.permissions.length} ACC
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {role.slug === 'super_admin' && <HiOutlineLockClosed className="text-rose-500/50 w-5 h-5" />}
                                        {selectedRole?.id === role.id && role.slug !== 'super_admin' && <HiOutlineShieldCheck className="text-emerald-500 w-5 h-5 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />}
                                    </div>
                                </button>

                                {/* Hover Actions */}
                                {role.slug !== 'super_admin' && role.slug !== 'user' && hasPermission('role.manage') && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/item:translate-x-0 bg-gray-900 border border-white/10 p-1.5 rounded-xl shadow-xl z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRoleToEdit(role);
                                                setEditRoleName(role.name);
                                                setShowEditModal(true);
                                            }}
                                            className="p-2 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all"
                                            title="Ubah Nama"
                                        >
                                            <HiOutlinePencil className="w-4 h-4" />
                                        </button>
                                        {role.slug !== 'admin' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRole(role);
                                                }}
                                                className="p-2 text-rose-500 hover:text-white hover:bg-rose-500/20 rounded-lg transition-all"
                                                title="Hapus Peran"
                                            >
                                                <HiOutlineTrash className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Permissions Matrix */}
                <div className="lg:col-span-3">
                    {selectedRole ? (
                        <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                            <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden">
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/5 blur-[50px] rounded-full point-events-none"></div>
                                <h2 className="text-3xl font-black uppercase text-white tracking-tight flex items-center gap-4 relative z-10">
                                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                        <HiOutlineShieldCheck className="text-emerald-400 w-7 h-7" />
                                    </div>
                                    <span className="drop-shadow-md">{selectedRole.name}</span>
                                    <span className="text-white/20 font-black text-2xl tracking-tighter mix-blend-overlay hidden sm:inline-block">/KONFIGURASI</span>
                                </h2>
                                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-4 ml-[60px] relative z-10">
                                    Aktifkan Toggle Di Bawah Ini Untuk Menyesuaikan Mode Akses "{selectedRole.name}"
                                </p>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {Object.entries(groupedPermissions).map(([category, perms]) => {
                                    const categoryMapping = {
                                        'dashboard': 'DASHBOARD',
                                        'product': 'SISTEM PRODUK',
                                        'taxonomy': 'TAKSONOMI',
                                        'order': 'SISTEM PESANAN',
                                        'user': 'SISTEM PENGGUNA',
                                        'customer': 'PELANGGAN',
                                        'staff': 'STAF & KARYAWAN',
                                        'finance': 'SISTEM KEUANGAN',
                                        'pos': 'SISTEM KASIR (POS)',
                                        'role': 'SISTEM PERAN',
                                        'blog': 'SISTEM BLOG',
                                        'audit': 'SISTEM AUDIT',
                                        'marketing': 'SISTEM PEMASARAN',
                                        'settings': 'PENGATURAN',
                                        'procurement': 'PENGADAAN (PO)',
                                        'crm': 'CRM & KONTAK'
                                    };
                                    const categoryName = categoryMapping[category] || category.toUpperCase();
                                    const isAllSelected = perms.every(p => selectedRole.permissions.some(rp => rp.id === p.id));
                                    const isLocked = selectedRole.slug === 'super_admin' || !hasPermission('role.manage');

                                    return (
                                        <div key={category} className="space-y-4 glass-card bg-white/[0.01] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-black/20 group/box">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-3 relative">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 group-hover/box:bg-emerald-400 group-hover/box:shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all"></div>
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-300 group-hover/box:text-white transition-colors">
                                                        {categoryName}
                                                    </span>
                                                </div>
                                                {!isLocked && (
                                                    <button
                                                        onClick={() => handleToggleCategory(category, perms)}
                                                        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter border whitespace-nowrap flex-shrink-0 ${isAllSelected
                                                            ? 'text-rose-400 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20'
                                                            : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20'
                                                            }`}
                                                    >
                                                        {isAllSelected ? 'CABUT SEMUA' : 'PILIH SEMUA'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-2.5">
                                                {perms.map(perm => {
                                                    const isActive = selectedRole.permissions.some(p => p.id === perm.id);
                                                    const isLocked = selectedRole.slug === 'super_admin' || !hasPermission('role.manage');

                                                    return (
                                                        <div
                                                            key={perm.id}
                                                            onClick={() => !isLocked && handleTogglePermission(perm.id)}
                                                            className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-300 gap-2 overflow-hidden ${isActive
                                                                ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/30 shadow-[inset_2px_0_0_rgba(16,185,129,0.5)]'
                                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/20'
                                                                } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                                                        >
                                                            <div className="flex-1 pr-2 min-w-0">
                                                                <p className={`text-[11px] uppercase tracking-wide font-black truncate ${isActive ? 'text-emerald-400' : 'text-gray-300 group-hover:text-white'} transition-colors`} title={perm.name}>
                                                                    {perm.name}
                                                                </p>
                                                                <p className="text-[9px] text-gray-500 font-mono mt-1 opacity-70 group-hover:opacity-100 truncate" title={perm.slug}>{perm.slug}</p>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isActive ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-500 space-y-6 glass-card rounded-3xl border border-white/5 bg-white/[0.01]">
                            <div className="relative">
                                <div className="absolute inset-0 blur-2xl bg-emerald-500/10 rounded-full"></div>
                                <HiOutlineShieldCheck className="w-20 h-20 text-emerald-500/30 relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="uppercase tracking-widest text-sm font-black text-gray-400">Pilih Peran Sistem</p>
                                <p className="text-[10px] text-gray-600 font-mono">Pilih dari daftar di sebelah kiri untuk mengonfigurasi parameter izin.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Role Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-white/10 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase italic text-white">Inisialisasi Peran Baru</h3>
                            <button onClick={() => setShowCreateModal(false)}><HiOutlineX className="text-gray-500 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleCreateRole} className="space-y-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Definisi Peran (Nama)</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Contoh: Moderator Konten"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                                Buat Peran
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-white/10 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase italic text-white">Ubah Nama Peran</h3>
                            <button onClick={() => setShowEditModal(false)}><HiOutlineX className="text-gray-500 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleUpdateRole} className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
                                <p className="text-gray-500 text-[10px] uppercase font-bold text-center">Slug Saat Ini</p>
                                <p className="text-white font-mono text-center text-sm mt-1">{roleToEdit?.slug}</p>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Nama Peran Baru</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Contoh: Moderator Konten"
                                    value={editRoleName}
                                    onChange={(e) => setEditRoleName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20">
                                Perbarui Nama Peran
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;
