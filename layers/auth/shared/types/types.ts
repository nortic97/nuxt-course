export interface BaseUser {
  id: string
  email: string
  name?: string | null
  avatar?: string
  provider: 'google' | 'github'
}

export interface GitHubUser extends BaseUser {
  login: string
  provider: 'github'
}

export interface GoogleUser extends BaseUser {
  provider: 'google'
}

export type AuthUser = GitHubUser | GoogleUser