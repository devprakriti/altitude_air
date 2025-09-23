import { defineStore } from 'pinia'
import type { User } from './auth'

export interface UsersState {
  users: User[]
  isLoading: boolean
  error: string | null
  searchQuery: string
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    users: [],
    isLoading: false,
    error: null,
    searchQuery: '',
  }),

  getters: {
    filteredUsers: (state): User[] => {
      if (!state.searchQuery) return state.users
      
      const query = state.searchQuery.toLowerCase()
      return state.users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      )
    },

    adminUsers: (state): User[] => state.users.filter(user => user.role === 'admin'),
    regularUsers: (state): User[] => state.users.filter(user => user.role === 'user'),
    totalUsers: (state): number => state.users.length,
    totalAdmins: (state): number => state.users.filter(user => user.role === 'admin').length,
    totalRegularUsers: (state): number => state.users.filter(user => user.role === 'user').length,
  },

  actions: {
    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    setError(error: string | null) {
      this.error = error
    },

    setUsers(users: User[]) {
      this.users = users
    },

    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    addUser(user: User) {
      this.users.push(user)
    },

    updateUser(updatedUser: User) {
      const index = this.users.findIndex(user => user.id === updatedUser.id)
      if (index !== -1) {
        this.users[index] = updatedUser
      }
    },

    removeUser(userId: string) {
      this.users = this.users.filter(user => user.id !== userId)
    },

    async fetchUsers() {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const result = await $authClient.admin.listUsers()

        if (result.error) {
          this.setError(result.error.message)
          return { success: false, error: result.error }
        }

        // Handle the case where data might be nested in a 'users' property
        const users = result.data?.users || result.data || []
        this.setUsers(users)
        return { success: true, data: users }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to fetch users'
        this.setError(errorMessage)
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    async createUser(data: { name: string; email: string; password: string; role: 'user' | 'admin' }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const result = await $authClient.admin.createUser(data)

        if (result.error) {
          this.setError(result.error.message)
          return { success: false, error: result.error }
        }

        // Add the new user to the store
        if (result.data) {
          this.addUser(result.data)
        }

        return { success: true, data: result.data }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create user'
        this.setError(errorMessage)
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    async updateUserData(userId: string, data: { name?: string; email?: string; role?: 'user' | 'admin' }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const result = await $authClient.admin.updateUser(userId, data)

        if (result.error) {
          this.setError(result.error.message)
          return { success: false, error: result.error }
        }

        // Update the user in the store
        if (result.data) {
          this.updateUser(result.data)
        }

        return { success: true, data: result.data }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to update user'
        this.setError(errorMessage)
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    async deleteUser(userId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const result = await $authClient.admin.deleteUser(userId)

        if (result.error) {
          this.setError(result.error.message)
          return { success: false, error: result.error }
        }

        // Remove the user from the store
        this.removeUser(userId)

        return { success: true }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to delete user'
        this.setError(errorMessage)
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    async getUser(userId: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $authClient } = useNuxtApp()
        const result = await $authClient.admin.getUser(userId)

        if (result.error) {
          this.setError(result.error.message)
          return { success: false, error: result.error }
        }

        return { success: true, data: result.data }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to get user'
        this.setError(errorMessage)
        return { success: false, error: { message: errorMessage } }
      } finally {
        this.setLoading(false)
      }
    },

    clearUsers() {
      this.users = []
      this.searchQuery = ''
      this.error = null
    },
  },
})
