import {
  Equipment,
  MaintenanceRecord,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MaintenanceSummary,
  StatusOption,
  MaintenanceTypeOption,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
const BACKEND_URL = API_URL.replace('/api', '');

export const getImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

// Equipment API
export const equipmentAPI = {
  getAll: async (includeInactive = false): Promise<{ equipment: Equipment[] }> => {
    const url = includeInactive
      ? `${API_URL}/maintenance/equipment?includeInactive=true`
      : `${API_URL}/maintenance/equipment`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch equipment');
    return response.json();
  },

  getById: async (id: number): Promise<{ equipment: Equipment }> => {
    const response = await fetch(`${API_URL}/maintenance/equipment/${id}`);
    if (!response.ok) throw new Error('Equipment not found');
    return response.json();
  },

  create: async (data: Partial<Equipment>): Promise<{ equipment: Equipment }> => {
    const response = await fetch(`${API_URL}/maintenance/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create equipment');
    }
    return response.json();
  },

  update: async (id: number, data: Partial<Equipment>): Promise<{ equipment: Equipment }> => {
    const response = await fetch(`${API_URL}/maintenance/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update equipment');
    }
    return response.json();
  },

  delete: async (id: number, permanent = false): Promise<{ success: boolean }> => {
    const url = permanent
      ? `${API_URL}/maintenance/equipment/${id}?permanent=true`
      : `${API_URL}/maintenance/equipment/${id}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete equipment');
    }
    return response.json();
  },

  toggle: async (id: number): Promise<{ success: boolean; equipment: Equipment; message: string }> => {
    const response = await fetch(`${API_URL}/maintenance/equipment/${id}/toggle`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle equipment status');
    }
    return response.json();
  },
};

// Maintenance Records API
export const maintenanceAPI = {
  // Get all records (returns formatted array for dashboard compatibility)
  getAll: async (status?: string): Promise<MaintenanceRecord[]> => {
    const url = status
      ? `${API_URL}/maintenance/records?status=${status}`
      : `${API_URL}/maintenance/records`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch records');
    return response.json();
  },

  // Get summary stats
  getSummary: async (): Promise<MaintenanceSummary> => {
    const response = await fetch(`${API_URL}/maintenance/summary`);
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  // Get record detail
  getById: async (id: string): Promise<any> => {
    const response = await fetch(`${API_URL}/maintenance/records/${id}`);
    if (!response.ok) throw new Error('Record not found');
    return response.json();
  },

  // Create record (supports FormData for multiple images)
  create: async (data: FormData): Promise<any> => {
    const response = await fetch(`${API_URL}/maintenance/records`, {
      method: 'POST',
      body: data,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create record');
    }
    return response.json();
  },

  // Update record (Supports FormData for status changes with images)
  update: async (id: string, data: UpdateMaintenanceDto | FormData): Promise<{ id: string; status: string }> => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_URL}/maintenance/records/${id}`, {
      method: 'PATCH',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? data : JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update record');
    }
    return response.json();
  },

  // Add comment
  addComment: async (id: string, userId: number, comment: string): Promise<any> => {
    const response = await fetch(`${API_URL}/maintenance/records/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, comment }),
    });
    if (!response.ok) throw new Error('Failed to add comment');
    return response.json();
  },

  // Delete record
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_URL}/maintenance/records/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete record');
    return response.json();
  },

  // Add progress update (with optional image)
  addProgressUpdate: async (id: string, formData: FormData): Promise<any> => {
    const response = await fetch(`${API_URL}/maintenance/records/${id}/update`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update progress');
    }
    return response.json();
  },

  // Update status
  updateStatus: async (id: string, status: string, data: any): Promise<any> => {
    const response = await fetch(`${API_URL}/status/records/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update status');
    }
    return response.json();
  },
};

// Status API
export const statusAPI = {
  // Get status options
  getOptions: async (): Promise<{
    statuses: StatusOption[];
    priorities: StatusOption[];
    categories: { value: string; label: string }[];
    maintenanceTypes: MaintenanceTypeOption[];
  }> => {
    const response = await fetch(`${API_URL}/status/options`);
    if (!response.ok) throw new Error('Failed to fetch options');
    return response.json();
  },
};

// Auth API
export const authAPI = {
  verify: async (accessToken: string): Promise<{ success: boolean; user: any }> => {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }
    return response.json();
  },

  registerUser: async (lineUserId: string, displayName?: string, email?: string): Promise<any> => {
    const response = await fetch(`${API_URL}/auth/register-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId, displayName, email }),
    });
    return response.json();
  },
};

// Usage Log API
export const usageAPI = {
  // Get usage logs by equipment
  getByEquipment: async (equipmentId: number, limit = 20): Promise<{ logs: any[] }> => {
    const response = await fetch(`${API_URL}/maintenance/equipment/${equipmentId}/usage-logs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch usage logs');
    return response.json();
  },

  // Get all usage logs
  getAll: async (limit = 50, equipmentId?: number): Promise<{ logs: any[] }> => {
    const url = equipmentId 
      ? `${API_URL}/maintenance/usage-logs?limit=${limit}&equipment_id=${equipmentId}`
      : `${API_URL}/maintenance/usage-logs?limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch usage logs');
    return response.json();
  },

  // Create usage log
  create: async (data: {
    equipment_id: number;
    usage_value: number;
    log_date?: string;
    notes?: string | null;
    recorded_by?: number;
  }): Promise<{ log: any; alerts?: any[]; message: string }> => {
    const response = await fetch(`${API_URL}/maintenance/equipment/${data.equipment_id}/usage-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create usage log');
    }
    return response.json();
  },

  // Update usage log (only latest)
  update: async (logId: number, data: {
    equipment_id: number;
    usage_value: number;
    notes?: string | null;
  }): Promise<{ log: any; message: string }> => {
    const response = await fetch(`${API_URL}/maintenance/usage-logs/${logId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update usage log');
    }
    return response.json();
  },
};

// Users API (for moderators)
export const usersAPI = {
  getAll: async (): Promise<{ users: any[] }> => {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  updateRole: async (id: number, role: string): Promise<any> => {
    const response = await fetch(`${API_URL}/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error('Failed to update role');
    return response.json();
  },

  delete: async (id: number): Promise<any> => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },
};

// =========================================
// NEW CMMS APIs
// =========================================

// Spare Parts API
export const sparePartsAPI = {
  getAll: async (params?: { category?: string; lowStock?: boolean; search?: string }): Promise<{ parts: any[]; stats: any }> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.lowStock) searchParams.append('lowStock', 'true');
    if (params?.search) searchParams.append('search', params.search);
    
    const url = `${API_URL}/spare-parts${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch spare parts');
    return response.json();
  },

  getById: async (id: number): Promise<{ part: any; transactions: any[]; usage: any[] }> => {
    const response = await fetch(`${API_URL}/spare-parts/${id}`);
    if (!response.ok) throw new Error('Spare part not found');
    return response.json();
  },

  create: async (data: any): Promise<{ part: any }> => {
    const response = await fetch(`${API_URL}/spare-parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create spare part');
    }
    return response.json();
  },

  update: async (id: number, data: any): Promise<{ part: any }> => {
    const response = await fetch(`${API_URL}/spare-parts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update spare part');
    }
    return response.json();
  },

  adjustStock: async (id: number, data: { transaction_type: string; quantity: number; notes?: string; user_id?: number }): Promise<{ transaction: any; new_stock: number }> => {
    const response = await fetch(`${API_URL}/spare-parts/${id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to adjust stock');
    }
    return response.json();
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/spare-parts/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete spare part');
    return response.json();
  },

  getCategories: async (): Promise<{ categories: string[] }> => {
    const response = await fetch(`${API_URL}/spare-parts/meta/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },
};

// Reports API
export const reportsAPI = {
  getSummary: async (params?: { startDate?: string; endDate?: string; equipmentId?: number }): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.equipmentId) searchParams.append('equipmentId', params.equipmentId.toString());
    
    const url = `${API_URL}/reports/summary${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  getMTBF: async (params?: { startDate?: string; endDate?: string; equipmentId?: number }): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.equipmentId) searchParams.append('equipmentId', params.equipmentId.toString());
    
    const response = await fetch(`${API_URL}/reports/mtbf${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch MTBF');
    return response.json();
  },

  getMTTR: async (params?: { startDate?: string; endDate?: string; equipmentId?: number }): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.equipmentId) searchParams.append('equipmentId', params.equipmentId.toString());
    
    const response = await fetch(`${API_URL}/reports/mttr${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch MTTR');
    return response.json();
  },

  getOEE: async (params?: { startDate?: string; endDate?: string; equipmentId?: number }): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.equipmentId) searchParams.append('equipmentId', params.equipmentId.toString());
    
    const response = await fetch(`${API_URL}/reports/oee${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch OEE');
    return response.json();
  },

  getCalendar: async (month?: number, year?: number): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (month) searchParams.append('month', month.toString());
    if (year) searchParams.append('year', year.toString());
    
    const response = await fetch(`${API_URL}/reports/calendar${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch calendar');
    return response.json();
  },

  exportData: async (params?: { startDate?: string; endDate?: string; equipmentId?: number; status?: string }): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.equipmentId) searchParams.append('equipmentId', params.equipmentId.toString());
    if (params?.status) searchParams.append('status', params.status);
    
    const response = await fetch(`${API_URL}/reports/export${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to export data');
    return response.json();
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async (userId: number, unreadOnly = false): Promise<{ notifications: any[]; unreadCount: number }> => {
    const params = new URLSearchParams({ userId: userId.toString() });
    if (unreadOnly) params.append('unreadOnly', 'true');
    
    const response = await fetch(`${API_URL}/notifications?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  // Fast polling - uses noti_list from user data
  quickCheck: async (userId: number): Promise<{ notiList: Record<string, { status: string; type: string; title: string; created_at: string }>; unreadCount: number }> => {
    const response = await fetch(`${API_URL}/notifications/quick/${userId}`);
    if (!response.ok) throw new Error('Failed to quick check');
    return response.json();
  },

  // Mark as read using quick API
  quickMarkAsRead: async (userId: number, msgId: number): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_URL}/notifications/quick/${userId}/${msgId}/read`, { method: 'PATCH' });
    if (!response.ok) throw new Error('Failed to mark as read');
    return response.json();
  },

  // Mark all as read using quick API
  quickMarkAllAsRead: async (userId: number): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_URL}/notifications/quick/${userId}/read-all`, { method: 'PATCH' });
    if (!response.ok) throw new Error('Failed to mark all as read');
    return response.json();
  },

  // Delete single notification
  delete: async (userId: number, msgId: number): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_URL}/notifications/quick/${userId}/${msgId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete notification');
    return response.json();
  },

  // Clear all notifications
  clearAll: async (userId: number): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_URL}/notifications/quick/${userId}/clear-all`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to clear all notifications');
    return response.json();
  },

  markAsRead: async (id: number): Promise<{ notification: any }> => {
    const response = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
    if (!response.ok) throw new Error('Failed to mark as read');
    return response.json();
  },

  markAllAsRead: async (userId: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to mark all as read');
    return response.json();
  },

  getPreferences: async (userId: number): Promise<{ preferences: any }> => {
    const response = await fetch(`${API_URL}/notifications/preferences/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch preferences');
    return response.json();
  },

  updatePreferences: async (userId: number, data: any): Promise<{ preferences: any }> => {
    const response = await fetch(`${API_URL}/notifications/preferences/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update preferences');
    return response.json();
  },
};

// Checklists API
export const checklistsAPI = {
  // Templates
  getTemplates: async (params?: { category?: string; equipment_type?: string }): Promise<{ templates: any[] }> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.equipment_type) searchParams.append('equipment_type', params.equipment_type);
    
    const response = await fetch(`${API_URL}/checklists/templates${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  getTemplate: async (id: number): Promise<{ template: any; items: any[] }> => {
    const response = await fetch(`${API_URL}/checklists/templates/${id}`);
    if (!response.ok) throw new Error('Template not found');
    return response.json();
  },

  createTemplate: async (data: any): Promise<{ template: any }> => {
    const response = await fetch(`${API_URL}/checklists/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create template');
    return response.json();
  },

  updateTemplate: async (id: number, data: any): Promise<{ template: any }> => {
    const response = await fetch(`${API_URL}/checklists/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update template');
    return response.json();
  },

  deleteTemplate: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/checklists/templates/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete template');
    return response.json();
  },

  // Responses
  getResponses: async (params?: { maintenance_record_id?: number; equipment_id?: number }): Promise<{ responses: any[] }> => {
    const searchParams = new URLSearchParams();
    if (params?.maintenance_record_id) searchParams.append('maintenance_record_id', params.maintenance_record_id.toString());
    if (params?.equipment_id) searchParams.append('equipment_id', params.equipment_id.toString());
    
    const response = await fetch(`${API_URL}/checklists/responses${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch responses');
    return response.json();
  },

  submitResponse: async (data: any): Promise<{ response: any }> => {
    const response = await fetch(`${API_URL}/checklists/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit response');
    return response.json();
  },

  // Daily Checklist
  getDailyResponses: async (date: string): Promise<{ responses: any[] }> => {
    const response = await fetch(`${API_URL}/checklists/daily/${date}`);
    if (!response.ok) throw new Error('Failed to fetch daily responses');
    return response.json();
  },

  checkDailyItem: async (data: {
    template_id: number;
    template_item_id: number;
    schedule_date: string;
    is_passed: boolean;
    checked_by: number;
    notes?: string;
  }): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_URL}/checklists/daily/check-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to check item');
    return response.json();
  },

  updateDailyItemNote: async (data: {
    template_id: number;
    template_item_id: number;
    schedule_date: string;
    notes: string;
  }): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_URL}/checklists/daily/update-note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update note');
    return response.json();
  },

  uploadDailyItemImage: async (formData: FormData): Promise<{ success: boolean; image_url: string }> => {
    const response = await fetch(`${API_URL}/checklists/daily/upload-image`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload image');
    return response.json();
  },
};

// Vendors API
export const vendorsAPI = {
  getAll: async (params?: { type?: string; search?: string }): Promise<{ vendors: any[] }> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.search) searchParams.append('search', params.search);
    
    const response = await fetch(`${API_URL}/vendors${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch vendors');
    return response.json();
  },

  getById: async (id: number): Promise<{ vendor: any; equipment: any[]; parts: any[] }> => {
    const response = await fetch(`${API_URL}/vendors/${id}`);
    if (!response.ok) throw new Error('Vendor not found');
    return response.json();
  },

  create: async (data: any): Promise<{ vendor: any }> => {
    const response = await fetch(`${API_URL}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create vendor');
    return response.json();
  },

  update: async (id: number, data: any): Promise<{ vendor: any }> => {
    const response = await fetch(`${API_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update vendor');
    return response.json();
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/vendors/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete vendor');
    return response.json();
  },

  // Warranties
  getWarranties: async (equipmentId?: number, expiring?: boolean): Promise<{ warranties: any[] }> => {
    const searchParams = new URLSearchParams();
    if (equipmentId) searchParams.append('equipment_id', equipmentId.toString());
    if (expiring) searchParams.append('expiring', 'true');
    
    const response = await fetch(`${API_URL}/vendors/warranties${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch warranties');
    return response.json();
  },

  createWarranty: async (data: any): Promise<{ warranty: any }> => {
    const response = await fetch(`${API_URL}/vendors/warranties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create warranty');
    return response.json();
  },

  // Documents
  getDocuments: async (equipmentId?: number): Promise<{ documents: any[] }> => {
    const searchParams = new URLSearchParams();
    if (equipmentId) searchParams.append('equipment_id', equipmentId.toString());
    
    const response = await fetch(`${API_URL}/vendors/documents${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  },
};

// Schedules API (Maintenance Calendar)
export const schedulesAPI = {
  getAll: async (): Promise<{ schedules: any[] }> => {
    const response = await fetch(`${API_URL}/schedules`);
    if (!response.ok) throw new Error('Failed to fetch schedules');
    return response.json();
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<{ schedules: any[] }> => {
    const response = await fetch(`${API_URL}/schedules?start_date=${startDate}&end_date=${endDate}`);
    if (!response.ok) throw new Error('Failed to fetch schedules');
    return response.json();
  },

  getById: async (id: number): Promise<{ schedule: any }> => {
    const response = await fetch(`${API_URL}/schedules/${id}`);
    if (!response.ok) throw new Error('Schedule not found');
    return response.json();
  },

  create: async (data: any): Promise<{ schedule: any }> => {
    const response = await fetch(`${API_URL}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create schedule');
    return response.json();
  },

  update: async (id: number, data: any): Promise<{ schedule: any }> => {
    const response = await fetch(`${API_URL}/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update schedule');
    return response.json();
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/schedules/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete schedule');
    return response.json();
  },
};

// Setup API (for migrations)
export const setupAPI = {
  migrate: async (): Promise<{ success: boolean; message: string; tables_created: string[] }> => {
    const response = await fetch(`${API_URL}/setup/migrate`, { method: 'POST' });
    if (!response.ok) throw new Error('Migration failed');
    return response.json();
  },

  getStatus: async (): Promise<{ tables: { name: string; count: number }[] }> => {
    const response = await fetch(`${API_URL}/setup/status`);
    if (!response.ok) throw new Error('Failed to get status');
    return response.json();
  },
};
