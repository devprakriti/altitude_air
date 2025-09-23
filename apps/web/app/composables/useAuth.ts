export const useAuth = () => {
	const authStore = useAuthStore();
	const usersStore = useUsersStore();

	// Initialize auth state on first use
	if (!authStore.isAuthenticated && !authStore.isLoading) {
		authStore.initializeAuth();
	}

	// Watch for session changes and update store
	const { $authClient } = useNuxtApp();
	const session = $authClient.useSession();

	watchEffect(() => {
		if (!session.value.isPending && session.value.data) {
			authStore.setAuthData(session.value.data.user, session.value.data.session);
		} else if (!session.value.isPending && !session.value.data) {
			authStore.clearAuth();
		}
	});

	return {
		// Auth state
		user: computed(() => authStore.user),
		isAuthenticated: computed(() => authStore.isAuthenticated),
		isLoading: computed(() => authStore.isLoading),
		isAdmin: computed(() => authStore.isAdmin),
		isUser: computed(() => authStore.isUser),
		error: computed(() => authStore.error),
		session: computed(() => authStore.session),

		// Auth actions
		signIn: authStore.signIn,
		signOut: authStore.signOut,
		updateProfile: authStore.updateProfile,

		// Admin functions (delegated to users store)
		createUser: usersStore.createUser,
		updateUser: usersStore.updateUserData,
		deleteUser: usersStore.deleteUser,
		listUsers: usersStore.fetchUsers,
		getUser: usersStore.getUser,
	};
};
