import { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { usePermission } from '../../../hooks/usePermission';
import { showToast } from '../../../utils/toast';
import {
    HiOutlineUsers,
    HiOutlineShieldCheck,
    HiOutlinePencil,
    HiOutlineSearch,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineKey,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineUser
} from 'react-icons/hi';
import { API_BASE_URL } from '../../../config/api';

const SystemUsers = () => {
    const { hasPermission } = usePermission();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [formData, setFormData] = useState({ role_id: '' });
    const [editData, setEditData] = useState({
        username: '',
        email: '',
        status: '',
        full_name: ''
    });
    const [createData, setCreateData] = useState({
        username: '',
        email: '',
        password: '',
        role_id: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Users
        try {
            const usersRes = await adminService.getSystemUsers({ limit: 1000 });

            // Defensive data parsing
            let userData = [];
            if (Array.isArray(usersRes)) {
                userData = usersRes;
            } else if (usersRes && Array.isArray(usersRes.data)) {
                userData = usersRes.data;
            } else if (usersRes && usersRes.users) {
                userData = usersRes.users;
            }

            setUsers(userData);
        } catch (error) {
            console.error('Failed to load system users', error);
            if (error.response?.status === 403) {

            }
        }

        // Fetch Roles
        try {
            const res = await fetch(`${API_BASE_URL}/admin/roles`, { headers });
            if (res.ok) {
                const rolesData = await res.json();
                setRoles(rolesData.data || (Array.isArray(rolesData) ? rolesData : []));
            } else if (res.status === 403) {
                console.warn('Role fetch permission denied');
            }
        } catch (error) {
            console.error('Failed to fetch roles', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditRole = (user) => {
        setSelectedUser(user);
        setFormData({ role_id: user.role_id || '' });
        setShowModal(true);
    };

    const handleSaveRole = async (e) => {
        e.preventDefault();
        try {
            await adminService.updateSystemUserRole(selectedUser.id, parseInt(formData.role_id));
            showToast.success('Role berhasil diperbarui');
            setShowModal(false);
            loadData();
        } catch (error) {
            showToast.error('Error mengubah role: ' + (error.message || 'Gagal'));
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setEditData({
            username: user.username || '',
            email: user.email || '',
            status: (user.status || 'active').toLowerCase(),
            full_name: user.full_name || user.username || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const res = await adminService.updateSystemUser(selectedUser.id, editData);
            showToast.success('Informasi staff berhasil diperbarui');
            setShowEditModal(false);
            loadData();
        } catch (error) {
            console.error('UPDATE ERROR:', error);
            const msg = error.response?.data?.error || error.message || 'Unknown error';
            showToast.error('Error memperbarui staff: ' + msg);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY DELETE staff "${user.username}"? This action cannot be undone.`)) {
            try {
                await adminService.deleteSystemUser(user.id);
                showToast.success('Akun staff berhasil dihapus');
                loadData();
            } catch (error) {
                showToast.error('Error menghapus staff: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();

        if (!createData.role_id) {
            showToast.warning('Pilih role yang valid untuk staff.');
            return;
        }

        try {
            await adminService.createSystemUser({
                ...createData,
                role_id: parseInt(createData.role_id)
            });

            showToast.success('Staff baru berhasil dibuat');
            setShowCreateModal(false);
            setCreateData({ username: '', email: '', password: '', role_id: '' });
            loadData();
        } catch (error) {
            console.error('Create user error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create user';
            showToast.error('Error membuat user: ' + errorMessage);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Staff Management</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Manage system administrators and operators</p>
                </div>
                <div className="flex items-center gap-4">
                    {hasPermission('user.create') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20"
                        >
                            <HiOutlinePlus className="w-4 h-4" />
                            Add New Staff
                        </button>
                    )}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-2 flex items-center gap-2 w-64 focus-within:border-blue-500/50 transition-colors">
                        <HiOutlineSearch className="text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-xs text-white w-full placeholder-gray-600 font-bold"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="text-center py-20 animate-pulse text-gray-500 font-mono">LOADING USER PROTOCOLS...</div>
                ) : (
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-6 text-[10px] uppercase font-black tracking-widest text-gray-400">Identity</th>
                                    <th className="p-6 text-[10px] uppercase font-black tracking-widest text-gray-400">Current Role</th>
                                    <th className="p-6 text-[10px] uppercase font-black tracking-widest text-gray-400">Status</th>
                                    <th className="p-6 text-[10px] uppercase font-black tracking-widest text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-gray-500">
                                                    {user.username?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{user.username}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.role?.slug === 'super_admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                user.role?.slug === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    user.role?.slug?.includes('manager') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        'bg-white/5 text-gray-400 border-white/10'
                                                }`}>
                                                {user.role?.name || 'Staff Node'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            {user.status === 'active' ? (
                                                <span className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                                    <HiOutlineCheckCircle /> Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                                                    <HiOutlineXCircle /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {hasPermission('user.edit') && (
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className="p-2 bg-white/5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all"
                                                        title="Edit Info"
                                                    >
                                                        <HiOutlinePencil className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {hasPermission('user.edit') && (
                                                    <button
                                                        onClick={() => handleEditRole(user)}
                                                        className="p-2 bg-white/5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all"
                                                        title="Assign Role"
                                                    >
                                                        <HiOutlineKey className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {hasPermission('user.manage') && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="p-2 bg-white/5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                                                        title="Delete Staff"
                                                    >
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card rounded-3xl w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-300 p-8">
                        <h3 className="text-2xl font-black text-white italic uppercase mb-6">Assign Role</h3>
                        <form onSubmit={handleSaveRole} className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
                                <p className="text-gray-500 text-[10px] uppercase font-bold text-center">Target User</p>
                                <p className="text-white font-bold text-center text-lg mt-1">{selectedUser?.username}</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-gray-500 text-[10px] uppercase font-bold">Select Role</label>
                                <div className="space-y-2">
                                    {roles.map(role => (
                                        <label key={role.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${parseInt(formData.role_id) === role.id
                                            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role.id}
                                                checked={parseInt(formData.role_id) === role.id}
                                                onChange={(e) => setFormData({ role_id: e.target.value })}
                                                className="hidden"
                                            />
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parseInt(formData.role_id) === role.id ? 'border-white bg-white' : 'border-gray-500'}`}>
                                                {parseInt(formData.role_id) === role.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-white uppercase tracking-wider">{role.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{role.slug}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm uppercase tracking-wider transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20">
                                    Save Assignment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Staff Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card rounded-3xl w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-300 p-8 shadow-2xl shadow-emerald-500/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">New Staff Node</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Username Profile</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                                    placeholder="e.g. jason_striker"
                                    value={createData.username}
                                    onChange={(e) => setCreateData({ ...createData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Secure Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                                    placeholder="staff@forzashop.io"
                                    value={createData.email}
                                    onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Access Credentials</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                                    placeholder="••••••••"
                                    value={createData.password}
                                    onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Node Clearances</label>
                                <select
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-emerald-500/50 text-sm font-bold uppercase cursor-pointer hover:bg-white/10 transition-all appearance-none"
                                    value={createData.role_id}
                                    onChange={(e) => setCreateData({ ...createData, role_id: e.target.value })}
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em' }}
                                >
                                    <option value="" disabled className="bg-gray-900 text-gray-500">Select Authorization...</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id} className="bg-gray-900 text-white">
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" disabled={updating} className="w-full py-4 mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/40 disabled:opacity-50">
                                {updating ? 'Initializing Node...' : 'Initialize Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Staff Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card rounded-3xl w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-300 p-8 shadow-2xl shadow-blue-500/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Edit Staff Node</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Full Name Identity</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                                    value={editData.full_name}
                                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                                    value={editData.username}
                                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Contact Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold opacity-50 cursor-not-allowed"
                                    value={editData.email}
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Operational Status</label>
                                <select
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-2 text-white focus:outline-none focus:border-blue-500/50 text-sm font-bold uppercase cursor-pointer hover:bg-white/10 transition-all appearance-none"
                                    value={editData.status}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em' }}
                                >
                                    <option value="active" className="bg-gray-900 text-emerald-400">ACTIVE - Online</option>
                                    <option value="inactive" className="bg-gray-900 text-rose-400">INACTIVE - Offline</option>
                                </select>
                            </div>

                            <button type="submit" disabled={updating} className="w-full py-4 mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-500/40 disabled:opacity-50">
                                {updating ? 'Saving Changes...' : 'Apply Updates'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemUsers;
