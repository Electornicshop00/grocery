import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { profile, updateUserProfile, loading } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (profile) {
      const nameParts = (profile.displayName || '').split(' ');
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: profile.phone || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameRegex = /^[a-zA-Z]{2,30}$/;
    const phoneRegex = /^(\+91)?[6789]\d{9}$/;

    if (!formData.firstName.trim()) {
      showToast('Please enter your first name', 'error');
      return;
    }
    if (!nameRegex.test(formData.firstName.trim())) {
      showToast('First name should be letters only (2-30 chars)', 'error');
      return;
    }
    if (!formData.lastName.trim()) {
      showToast('Please enter your last name', 'error');
      return;
    }
    if (!nameRegex.test(formData.lastName.trim())) {
      showToast('Last name should be letters only (2-30 chars)', 'error');
      return;
    }
    
    const cleanPhone = formData.phone.trim().replace(/[\s\-]/g, '');
    if (!cleanPhone) {
      showToast('Please enter your phone number', 'error');
      return;
    }
    if (!phoneRegex.test(cleanPhone)) {
      showToast('Please enter a valid Indian phone number (e.g., +919876543210 or 9876543210)', 'error');
      return;
    }

    if (!formData.address.trim()) {
      showToast('Please enter your address', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      await updateUserProfile({
        displayName: fullName,
        phone: formData.phone,
        address: formData.address
      });
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast('Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <div 
          className="p-8 text-white"
          style={{ backgroundColor: 'rgb(39, 96, 27)' }}
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <User className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile?.displayName || 'User Profile'}</h1>
              <p className="text-gray-300">{profile?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: 'rgb(39, 96, 27)' }} /> {t('firstName')}
                </label>
                <input 
                  type="text"
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder={t('firstName')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: 'rgb(39, 96, 27)' }} /> {t('lastName')}
                </label>
                <input 
                  type="text"
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder={t('lastName')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" style={{ color: 'rgb(39, 96, 27)' }} /> Phone Number
                </label>
                <input 
                  type="tel"
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: 'rgb(39, 96, 27)' }} /> Delivery Address
                </label>
                <textarea 
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-500 transition-all resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your delivery address"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              {isEditing ? (
                <>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
