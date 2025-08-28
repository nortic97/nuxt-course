// Logger que solo muestra mensajes en desarrollo
const logger = {
  error: (message: string, error: any, context: Record<string, any> = {}) => {
    if (process.dev) {
      console.error(`[AUTH] ${message}`, { error, ...context });
    }
  },
  warn: (message: string, context: Record<string, any> = {}) => {
    if (process.dev) {
      console.warn(`[AUTH] ${message}`, context);
    }
  },
  info: (message: string, context: Record<string, any> = {}) => {
    if (process.dev) {
      console.log(`[AUTH] ${message}`, context);
    }
  }
};

export const useAuth = () => {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  // Mantener cookie x-user-id sincronizada con la sesión
  const userIdCookie = useCookie('x-user-id')
  
  // Obtener el userId desde la sesión de Nuxt
  const userId = computed(() => session.value?.databaseUserId || null)
  
  // Sincronizar cookie con sesión cuando cambie
  watch(userId, (newUserId) => {
    if (newUserId) {
      userIdCookie.value = newUserId.toString()
    } else {
      userIdCookie.value = null
    }
  }, { immediate: true })

  const logout = async () => {
    try {
      await clear()
      // Limpiar la cookie del userId
      userIdCookie.value = null
      // Forzar recarga completa para limpiar el estado
      await navigateTo('/login')
    } catch (error) {
      logger.error('Error durante el cierre de sesión', error, { 
        userId: userId.value 
      })
      // Si hay un error, igualmente limpiar cookies y redirigir
      userIdCookie.value = null
      await navigateTo('/login')
    }
  }

  const isAuthenticated = computed(
    () =>
      loggedIn.value &&
      session.value?.databaseUserId !== undefined
  )

  // User properties that work for both providers
  const userName = computed(
    () =>
      (user.value as AuthUser)?.name ??
      (user.value as AuthUser)?.email ??
      'User'
  )

  const userAvatar = computed(() => {
    const authUser = user.value as AuthUser
    return 'avatar' in authUser
      ? authUser.avatar
      : authUser.avatar ?? null
  })

  const userEmail = computed(
    () => (user.value as AuthUser)?.email ?? null
  )

  // Additional provider-specific info
  const authProvider = computed(() => {
    return session.value?.provider || null
  })

  return {
    isAuthenticated,
    user: readonly(user),
    session: readonly(session),
    authProvider,
    userId: readonly(userId),

    refresh: fetch,
    logout,

    userName,
    userAvatar,
    userEmail,
  }
}