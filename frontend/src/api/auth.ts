import api from './client'
import type { Token, User } from '@/types'

export const authApi = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post<User>('/auth/signup', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<Token>('/auth/login', data).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}
