export const useAuth = () => {
	const { $authClient } = useNuxtApp();
	const session = $authClient.useSession();

	const user = computed(() => session.value.data?.user);
	const isAuthenticated = computed(() => !!session.value.data);
	const isLoading = computed(() => session.value.isPending);

	const signIn = async (email: string, password: string) => {
		return await $authClient.signIn.email({
			email,
			password,
		});
	};

	const signUp = async (name: string, email: string, password: string) => {
		return await $authClient.signUp.email({
			name,
			email,
			password,
		});
	};

	const signOut = async () => {
		await $authClient.signOut();
		await navigateTo('/login');
	};

	const updateProfile = async (data: { name?: string; image?: string }) => {
		return await $authClient.updateUser(data);
	};

	return {
		user,
		isAuthenticated,
		isLoading,
		session,
		signIn,
		signUp,
		signOut,
		updateProfile,
	};
};
