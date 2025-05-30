import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import ProfilesView from '../views/ProfilesView.vue';
import DefaultLayout from '../layouts/DefaultLayout.vue';

// Import new placeholder views
import CreateProfileView from '../views/CreateProfileView.vue';
import EditProfileView from '../views/EditProfileView.vue';
import TerminalConnectionView from '../views/TerminalConnectionView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  // {
  //   path: '/register',
  //   name: 'Register',
  //   component: () => import('../views/RegisterView.vue'),
  //   meta: { requiresGuest: true },
  // },
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { requiresAuth: true },
      },
      {
        path: 'profiles', // This is the existing placeholder, perhaps for listing all profiles
        name: 'ProfilesList', // Renamed for clarity if DashboardView is main list
        component: ProfilesView, // Or a new ProfilesListView if Dashboard isn't it
        meta: { requiresAuth: true },
      },
      {
        path: 'profiles/new',
        name: 'ProfileCreate',
        component: CreateProfileView,
        meta: { requiresAuth: true },
      },
      {
        path: 'profiles/edit/:id',
        name: 'ProfileEdit',
        component: EditProfileView,
        props: true, // Pass route params as props to the component
        meta: { requiresAuth: true },
      },
      {
        path: 'terminal/:id',
        name: 'TerminalConnection',
        component: TerminalConnectionView,
        props: true, // Pass route params as props to the component
        meta: { requiresAuth: true },
      },
    ],
  },
  // {
  //   path: '/:catchAll(.*)*',
  //   name: 'NotFound',
  //   component: () => import('../views/NotFoundView.vue'),
  // }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken');

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      next({ name: 'Login', query: { redirect: to.fullPath } });
    } else {
      next();
    }
  } else if (to.matched.some(record => record.meta.requiresGuest)) {
    if (token) {
      next({ name: 'Dashboard' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
