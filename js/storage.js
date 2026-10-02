/**
 * AEGIS - Local Storage & Audit Log Manager
 */

class StorageManager {
  constructor() {
    this.PROFILE_KEY = 'aegis_custom_profile';
    this.SELECTED_PROFILE_KEY = 'aegis_selected_profile_id';
    this.AUDIT_LOG_KEY = 'aegis_soc_audit_logs';
  }

  getCustomProfile() {
    try {
      const data = localStorage.getItem(this.PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveCustomProfile(profile) {
    try {
      localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.error('Failed to save profile to localStorage:', e);
      return false;
    }
  }

  getSelectedProfileId() {
    try {
      return localStorage.getItem(this.SELECTED_PROFILE_KEY) || 'ananya_sridhar';
    } catch (e) {
      return 'ananya_sridhar';
    }
  }

  setSelectedProfileId(id) {
    try {
      localStorage.setItem(this.SELECTED_PROFILE_KEY, id);
    } catch (e) {}
  }

  getAuditLogs() {
    try {
      const data = localStorage.getItem(this.AUDIT_LOG_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  addAuditLog(entry) {
    try {
      const logs = this.getAuditLogs();
      logs.unshift(entry);
      if (logs.length > 100) logs.pop();
      localStorage.setItem(this.AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch (e) {}
  }

  clearAuditLogs() {
    try {
      localStorage.removeItem(this.AUDIT_LOG_KEY);
    } catch (e) {}
  }
}

if (typeof module !== 'undefined') module.exports = StorageManager;
if (typeof window !== 'undefined') window.StorageManager = StorageManager;
