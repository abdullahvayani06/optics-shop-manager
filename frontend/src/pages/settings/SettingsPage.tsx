import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  KeyRound, 
  RotateCcw, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { User, BusinessSettings } from '../../types/index.js';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.js';
import { formatDate } from '../../utils/formatters.js';

export const SettingsPage: React.FC = () => {
  const { user, role, refreshUser } = useAuth();
  const isOwner = role === 'owner';

  const [activeTab, setActiveTab] = useState<'profile' | 'staff' | 'security' | 'database'>('profile');

  // Business Profile Form State
  const [settings, setSettings] = useState<BusinessSettings>({
    shop_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    logo_url: '',
    invoice_footer: '',
    allow_negative_stock: 'false',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  // Staff List State
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff' as 'owner' | 'staff',
  });
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Demo Management State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isRemoveDemoConfirmOpen, setIsRemoveDemoConfirmOpen] = useState(false);
  const [removingDemo, setRemovingDemo] = useState(false);
  const [demoActionMessage, setDemoActionMessage] = useState<string | null>(null);

  // Load Settings
  const fetchSettings = async () => {
    try {
      const res = await api.get<{ settings: BusinessSettings }>('/settings/business');
      setSettings(res.settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // Load Staff
  const fetchStaff = async () => {
    if (!isOwner) return;
    try {
      const res = await api.get<{ staff: User[] }>('/settings/staff');
      setStaffList(res.staff);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (isOwner) fetchStaff();
  }, [isOwner]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await api.put<{ settings: BusinessSettings; message: string }>('/settings/business', settings);
      setSettings(res.settings);
      setSettingsMessage('Business profile and invoice settings saved successfully.');
    } catch (err: any) {
      setSettingsMessage(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    if (!staffForm.full_name.trim() || !staffForm.email.trim()) {
      setStaffError('Name and email are required.');
      return;
    }

    if (!editingStaff && (!staffForm.password || staffForm.password.length < 6)) {
      setStaffError('Password must be at least 6 characters long.');
      return;
    }

    setSavingStaff(true);
    try {
      if (editingStaff) {
        await api.put(`/settings/staff/${editingStaff.id}`, staffForm);
      } else {
        await api.post('/settings/staff', staffForm);
      }
      setIsStaffModalOpen(false);
      setEditingStaff(null);
      setStaffForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        role: 'staff',
      });
      fetchStaff();
    } catch (err: any) {
      setStaffError(err.message || 'Failed to save staff member.');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaffId) return;
    try {
      await api.delete(`/settings/staff/${deletingStaffId}`);
      setDeletingStaffId(null);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password changed successfully! Keep your new credentials safe.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetDemoData = async () => {
    setResetting(true);
    try {
      await api.post('/settings/reset-demo');
      setIsResetConfirmOpen(false);
      alert('Demo data reset successfully with fresh Pakistani optics records.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo data.');
    } finally {
      setResetting(false);
    }
  };

  const handleRemoveDemoData = async () => {
    setRemovingDemo(true);
    setDemoActionMessage(null);
    try {
      const res = await api.delete<{ message: string }>('/settings/demo-data');
      setIsRemoveDemoConfirmOpen(false);
      setDemoActionMessage(res.message || 'Demo records successfully removed. Production records preserved.');
    } catch (err: any) {
      alert(err.message || 'Failed to remove demo data.');
    } finally {
      setRemovingDemo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System & Shop Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure optics showroom profile, staff access accounts, and security credentials
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'profile'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business Profile & Invoice</span>
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'staff'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Management</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'security'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'database'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Database & Demo Reset</span>
          </button>
        )}
      </div>

      {/* TAB 1: BUSINESS PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            {settingsMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{settingsMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isOwner}
                  value={settings.shop_name || ''}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  placeholder="VisionOptics Pakistan"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Phone
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Helpline
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={settings.whatsapp || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  disabled={!isOwner}
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="contact@visionoptics.pk"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Showroom Address (Printed on Invoices & Prescriptions)
              </label>
              <textarea
                rows={2}
                disabled={!isOwner}
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Suite 402, Al-Latif Centre, Main Boulevard, Gulberg III, Lahore, Pakistan"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Footer Notice (Terms & Return Policy)
              </label>
              <textarea
                rows={2}
                disabled={!isOwner}
                value={settings.invoice_footer || ''}
                onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
                placeholder="Thank you for choosing VisionOptics. Exchange within 7 days with original invoice."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 disabled:bg-slate-50"
              />
            </div>

            {/* Negative Stock Policy */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={settings.allow_negative_stock === 'true'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allow_negative_stock: e.target.checked ? 'true' : 'false',
                    })
                  }
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Allow Negative Stock Selling
                  </span>
                  <p className="text-[11px] text-slate-500">
                    When unchecked (default), the system strictly prevents sales that exceed available product quantity.
                  </p>
                </div>
              </label>
            </div>

            {isOwner && (
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: STAFF MANAGEMENT (Owner Only) */}
      {activeTab === 'staff' && isOwner && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Staff Accounts</h3>
              <p className="text-xs text-slate-500">
                Create and manage optician and sales accounts. Public signup is disabled for security.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingStaff(null);
                setStaffForm({
                  full_name: '',
                  email: '',
                  phone: '',
                  password: '',
                  role: 'staff',
                });
                setIsStaffModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Account</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Account Created</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">
                      {s.full_name}
                      {s.id === user?.id && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded-full font-normal">
                          You
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">{s.email}</td>
                    <td className="p-3.5 text-slate-500">{s.phone || '-'}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          s.role === 'owner'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-brand-100 text-brand-800'
                        }`}
                      >
                        {s.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{formatDate(s.created_at)}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingStaff(s);
                            setStaffForm({
                              full_name: s.full_name,
                              email: s.email,
                              phone: s.phone || '',
                              password: '',
                              role: s.role,
                            });
                            setIsStaffModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {s.id !== user?.id && (
                          <button
                            onClick={() => setDeletingStaffId(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Remove Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add/Edit Staff Modal */}
          {isStaffModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {editingStaff ? 'Edit Staff Account' : 'Create New Staff Account'}
                </h3>
                {staffError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                    {staffError}
                  </div>
                )}
                <form onSubmit={handleStaffSubmit} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.full_name}
                      onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                      placeholder="e.g. Zeeshan Ali"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={!!editingStaff}
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      placeholder="staff@opticsshop.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      placeholder="0321-4455667"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Access Role</label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="staff">Staff (Sales, Stock, Rx, Customers)</option>
                      <option value="owner">Owner (Full Finance, Expenses & Settings)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {editingStaff ? 'Reset Password (Leave blank to keep existing)' : 'Initial Password'}
                    </label>
                    <input
                      type="password"
                      required={!editingStaff}
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsStaffModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingStaff}
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-sm"
                    >
                      {savingStaff ? 'Saving...' : editingStaff ? 'Update Account' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Staff Delete Dialog */}
          <ConfirmDialog
            isOpen={!!deletingStaffId}
            title="Remove Staff Account?"
            message="Are you sure you want to remove this staff user account? They will immediately lose access to the system."
            confirmLabel="Remove Account"
            variant="danger"
            onConfirm={handleDeleteStaff}
            onCancel={() => setDeletingStaffId(null)}
          />
        </div>
      )}

      {/* TAB 3: CHANGE PASSWORD (Fulfills Requirement 4) */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs max-w-lg">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <KeyRound className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Change Your Password</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                {passwordSuccess}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: DATABASE & DEMO RESET */}
      {activeTab === 'database' && isOwner && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <RotateCcw className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Database & Demo Management</h3>
          </div>

          {demoActionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{demoActionMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Remove Demo Data */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Remove Demo Records (Go Live)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Safely remove all preloaded demo records (demo customers, catalog samples, demo invoices, dummy expenses) while preserving your real business records.
                </p>
              </div>

              <div>
                <button
                  onClick={() => setIsRemoveDemoConfirmOpen(true)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  Remove Demo Data
                </button>
              </div>
            </div>

            {/* Card 2: Reset to Fresh Demo */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <RotateCcw className="w-4 h-4 text-brand-600" />
                  <span>Reset to Demo Dataset</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Re-initialize the database with a fresh set of realistic Pakistani optics store demo data (10 customers, 18 eyewear products, sample sales & expenses).
                </p>
              </div>

              <div>
                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  Reset to Fresh Demo Dataset
                </button>
              </div>
            </div>
          </div>

          {/* Remove Demo Confirmation Dialog */}
          <ConfirmDialog
            isOpen={isRemoveDemoConfirmOpen}
            title="Remove Demo Data?"
            message="This will remove demo records. Continue?"
            confirmLabel="Remove Demo Data"
            variant="danger"
            isLoading={removingDemo}
            onConfirm={handleRemoveDemoData}
            onCancel={() => setIsRemoveDemoConfirmOpen(false)}
          />

          {/* Reset Confirmation Dialog */}
          <ConfirmDialog
            isOpen={isResetConfirmOpen}
            title="Reset All Data to Demo?"
            message="This will re-initialize the database with fresh Pakistani demo records. Any newly entered data will be reset."
            confirmLabel="Confirm Reset"
            variant="danger"
            isLoading={resetting}
            onConfirm={handleResetDemoData}
            onCancel={() => setIsResetConfirmOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
