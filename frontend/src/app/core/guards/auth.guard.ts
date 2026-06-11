import { inject } from "@angular/core";
import { CanActivateChildFn, CanActivateFn, Router } from "@angular/router";

import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn & CanActivateChildFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token) {
    return true;
  }
  return router.createUrlTree(["/login"]);
};

