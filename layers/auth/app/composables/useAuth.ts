export const useAuth = () => {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  // Obtener el userId desde la cookie x-user-id
  const userIdCookie = useCookie('x-user-id')
  const userId = computed(() => userIdCookie.value || null)

  const logout = async () => {
    try {
      await clear()
      // Limpiar la cookie del userId
      userIdCookie.value = null
      // Forzar recarga completa para limpiar el estado
      await navigateTo('/login')
    } catch (error) {
      console.error('Error during logout:', error)
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