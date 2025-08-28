// Composable for date handling utilities
export default function useDateUtils() {
  /**
   * Normalizes a date to midnight (00:00:00) in the local time zone
   */
  const normalizeDate = (date: Date): Date => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  /**
   * Checks if a date is today
   */
  const isToday = (date: Date): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  /**
   * Checks if a date is yesterday
   */
  const isYesterday = (date: Date): boolean => {
    if (!date) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  /**
   * Gets the date of a chat for grouping, using updatedAt (recent activity)
   */
  const getChatDate = (chat: any): Date | null => {
    // Prioritize updatedAt to determine recent activity
    const dateField = chat?.updatedAt || chat?.createdAt;
    if (!dateField) return null;
    
    // If it is a Firestore object with _seconds
    if (dateField._seconds !== undefined) {
      return new Date(dateField._seconds * 1000 + (dateField._nanoseconds || 0) / 1000000);
    }
    
    // If it is a date string or timestamp
    try {
      return new Date(dateField);
    } catch (e) {
      console.error('Error parsing chat date:', e);
      return null;
    }
  };

  /**
   * Groups chats by date (today, yesterday, older)
   */
  const groupChatsByDate = (chats: any[]) => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const older: any[] = [];

    chats.forEach(chat => {
      const chatDate = getChatDate(chat);
      if (!chatDate) return;

      if (isToday(chatDate)) {
        today.push(chat);
      } else if (isYesterday(chatDate)) {
        yesterday.push(chat);
      } else {
        older.push(chat);
      }
    });

    return { today, yesterday, older };
  };

  return {
    normalizeDate,
    isToday,
    isYesterday,
    getChatDate,
    groupChatsByDate
  };
}
