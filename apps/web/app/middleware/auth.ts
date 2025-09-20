export default defineNuxtRouteMiddleware(async (to, from) => {
	const { $authClient } = useNuxtApp();
	const session = $authClient.useSession();

	// Protected routes that require authentication
	const protectedRoutes = ['/', '/dashboard', '/todos', '/customers', '/inbox', '/settings'];
	const isProtectedRoute = protectedRoutes.some(route => to.path.startsWith(route));

	// If trying to access protected route and session is still loading, redirect to login
	if (isProtectedRoute && session.value.isPending) {
		return navigateTo('/login');
	}

	// If user is not authenticated and trying to access protected route
	if (!session.value.data && isProtectedRoute) {
		return navigateTo('/login');
	}

	// If user is authenticated and trying to access login page
	if (session.value.data && to.path === '/login') {
		return navigateTo('/dashboard');
	}
});
