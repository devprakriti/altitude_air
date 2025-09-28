import { defineStore } from 'pinia'

export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  image?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  emailVerified?: boolean
}

export interface Session {
  id: string
  userId: string
  expiresAt: Date | string
  token: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface AuthState {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }),

  getters: {
    isAdmin: (state): boolean => state.user?.role === 'admin',
    isUser: (state): boolean => state.user?.role === 'user' || !state.user?.role,
    userDisplayName: (state): string => state.user?.name || state.user?.email || 'Guest User',
    userAvatar: (state): string => {
      if (state.user?.image) return state.user.image
      const name = state.user?.name || state.user?.email || 'Guest'
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    },
  },

  actions: {
    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    setError(error: string | null) {
      this.error = error
    },

    setUser(user: User | null) {
      this.user = user
      this.isAuthenticated = !!user
    },

    setSession(session: Session | null) {
      this.session = session
    },

    setAuthData(user: any | null, session: any | null) {

      // Transform the user object to match our interface
      if (user) {
        this.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user', // Default to 'user' if role is not set
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          emailVerified: user.emailVerified,
        }
      } else {
        this.user = null
      }
      
      this.session = session
      this.isAuthenticated = !!user
      this.error = null
      
    },

    clearAuth() {
      this.user = null
      this.session = null
      this.isAuthenticated = false
      this.error = null
    },

    async signIn(email: string, password: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const result = await $authClient.signIn.email({
          email,
          password,
        })

        if (result.error) {
          return { success: false, error: result.error }
        }

        // Update local auth state immediately
        if (result.data?.user) {
          // Create a session object from the token
          const session = result.data.token ? {
            token: result.data.token,
            // Add other session properties as needed
          } : null;
          
          console.log('Setting auth data with:', result.data.user, session);
          this.setAuthData(result.data.user, session)
        } else {
          console.log('No user data found in result');
        }

        return { success: true, data: result.data }
      } catch (error: any) {
        const errorMessage = error.message || 'An unexpected error occurred'
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    async signOut() {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        await $authClient.signOut()
        this.clearAuth()
        await navigateTo('/login')
        return { success: true }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to sign out'
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    async updateProfile(data: { name?: string; image?: string }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const result = await $authClient.updateUser(data)

        if (result.error) {
          return { success: false, error: result.error }
        }

        // Update local user data
        if (this.user && result.data) {
          this.user = { ...this.user, ...result.data }
        }

        return { success: true, data: result.data }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to update profile'
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    // Initialize auth state from session
    async initializeAuth() {
      // Only initialize if not already loading or authenticated
      if (this.isLoading || this.isAuthenticated) {
        return { success: true }
      }

      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const session = $authClient.useSession()

        // Wait for session to load
        await new Promise((resolve) => {
          const unwatch = watch(session, (newSession) => {
            if (!newSession.isPending) {
              unwatch()
              resolve(newSession)
            }
          }, { immediate: true })
        })

        if (session.value.data) {
          this.setAuthData(session.value.data.user, session.value.data.session)
        } else {
          this.clearAuth()
        }

        return { success: true }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to initialize auth'
        this.setError(errorMessage)
        this.clearAuth()
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },
  },
})
