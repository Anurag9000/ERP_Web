export const departmentColors = {
  COMPUTER_SCIENCE: '#B8D4E8',
  MATHEMATICS: '#E8C1D4',
  PHYSICS: '#D4E8C1',
  CHEMISTRY: '#E8D4B8',
  BIOLOGY: '#C1E8D4',
  ENGINEERING: '#D4C1E8',
  BUSINESS: '#E8E8C1',
  ARTS: '#E8B8C1',
  DEFAULT: '#E0E0E0',
};

export const notificationCategoryColors = {
  ACADEMIC: '#B8D4E8',
  FINANCE: '#E8C1D4',
  EVENTS: '#D4E8C1',
  SYSTEM: '#E8D4B8',
  CLUBS: '#C1E8D4',
  GRADES: '#D4C1E8',
  ATTENDANCE: '#E8E8C1',
  ENROLLMENT: '#E8B8C1',
};

export const eventTypeColors = {
  CLASS: '#B8D4E8',
  EXAM: '#E8C1D4',
  EVENT: '#D4E8C1',
  MEETING: '#E8D4B8',
  OFFICE_HOURS: '#C1E8D4',
  CLUB: '#D4C1E8',
  DEADLINE: '#E8E8C1',
  HOLIDAY: '#E8B8C1',
};

export const priorityColors = {
  LOW: '#E8E8E8',
  NORMAL: '#D4E8C1',
  HIGH: '#E8D4B8',
  URGENT: '#E8C1D4',
};

export const statusColors = {
  ACTIVE: '#C1E8D4',
  PENDING: '#E8E8C1',
  COMPLETED: '#B8D4E8',
  CANCELLED: '#E8C1D4',
  OPEN: '#C1E8D4',
  CLOSED: '#E8D4B8',
};

export function getDepartmentColor(departmentCode: string): string {
  return departmentColors[departmentCode as keyof typeof departmentColors] || departmentColors.DEFAULT;
}

export function getNotificationColor(category: string): string {
  return notificationCategoryColors[category as keyof typeof notificationCategoryColors] || '#E0E0E0';
}

export function getEventColor(eventType: string): string {
  return eventTypeColors[eventType as keyof typeof eventTypeColors] || '#E0E0E0';
}

export function getPriorityColor(priority: string): string {
  return priorityColors[priority as keyof typeof priorityColors] || '#E0E0E0';
}

export function getStatusColor(status: string): string {
  return statusColors[status as keyof typeof statusColors] || '#E0E0E0';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155 ? '#1F2937' : '#FFFFFF';
}
