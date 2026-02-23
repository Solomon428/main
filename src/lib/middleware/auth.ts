// Direct export from middleware for auth functions
export {
  authenticate,
  withAuth,
  requireRole,
  optionalAuth,
  type AuthenticatedRequest
} from "../../middleware/auth.middleware";

// Alias for backwards compatibility
import { authenticate } from "../../middleware/auth.middleware";
export const authMiddleware = authenticate;
