import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRouters } from '../modules/user/user.routes';
const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
