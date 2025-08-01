export const useAuth = () => {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  const logout = async () => {
    await clear()
    await navigateTo('/login')
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

    refresh: fetch,
    logout,

    userName,
    userAvatar,
    userEmail,
  }
}