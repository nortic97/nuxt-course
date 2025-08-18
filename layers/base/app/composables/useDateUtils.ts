// Composable para utilidades de manejo de fechas
export default function useDateUtils() {
  /**
   * Normaliza una fecha a la medianoche (00:00:00) en la zona horaria local
   */
  const normalizeDate = (date: Date): Date => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  /**
   * Verifica si una fecha es hoy
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
   * Verifica si una fecha es ayer
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
   * Obtiene la fecha de un chat para agrupación, usando updatedAt (actividad reciente)
   */
  const getChatDate = (chat: any): Date | null => {
    // Priorizar updatedAt para determinar actividad reciente
    const dateField = chat?.updatedAt || chat?.createdAt;
    if (!dateField) return null;
    
    // Si es un objeto de Firestore con _seconds
    if (dateField._seconds !== undefined) {
      return new Date(dateField._seconds * 1000 + (dateField._nanoseconds || 0) / 1000000);
    }
    
    // Si es un string de fecha o timestamp
    try {
      return new Date(dateField);
    } catch (e) {
      console.error('Error al parsear la fecha del chat:', e);
      return null;
    }
  };

  /**
   * Agrupa chats por fecha (hoy, ayer, anteriores)
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
