import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ok, ApiException } from "../lib/apiResponse.js";
import { usersRepo } from "../lib/repositories.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("SUPER_ADMIN"));

function toPublicUser(u: ReturnType<typeof usersRepo.findById>) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    profileImageUrl: u.profileImageUrl,
    isDemo: Boolean(u.isDemo),
    role: u.role,
  };
}

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = usersRepo.listAll().map(toPublicUser);
    ok(res, users);
  }),
);

adminRouter.post(
  "/users/:id/promote",
  asyncHandler(async (req, res) => {
    const target = usersRepo.findById(req.params.id);
    if (!target) throw new ApiException(404, "NOT_FOUND", "User not found.");
    if (target.role === "SUPER_ADMIN") {
      throw new ApiException(400, "INVALID_TARGET", "The Super Admin's role can't be changed.");
    }
    const updated = usersRepo.updateRole(target.id, "ADMIN");
    ok(res, toPublicUser(updated));
  }),
);

adminRouter.post(
  "/users/:id/demote",
  asyncHandler(async (req, res) => {
    const target = usersRepo.findById(req.params.id);
    if (!target) throw new ApiException(404, "NOT_FOUND", "User not found.");
    if (target.role === "SUPER_ADMIN") {
      throw new ApiException(400, "INVALID_TARGET", "The Super Admin's role can't be changed.");
    }
    const updated = usersRepo.updateRole(target.id, "USER");
    ok(res, toPublicUser(updated));
  }),
);
