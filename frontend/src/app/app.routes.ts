import { Routes } from "@angular/router";

import { authGuard } from "./core/guards/auth.guard";
import { ShellComponent } from "./layout/shell.component";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () => import("./features/login/login.component").then((m) => m.LoginComponent)
  },
  {
    path: "",
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
      {
        path: "dashboard",
        loadComponent: () => import("./features/dashboard/dashboard.component").then((m) => m.DashboardComponent)
      },
      {
        path: "map",
        loadComponent: () => import("./features/map/map.component").then((m) => m.MapComponent)
      },
      {
        path: "population",
        loadComponent: () => import("./features/population/population.component").then((m) => m.PopulationComponent)
      },
      {
        path: "capacity",
        loadComponent: () => import("./features/capacity/capacity.component").then((m) => m.CapacityComponent)
      },
      {
        path: "zoning",
        loadComponent: () => import("./features/zoning/zoning.component").then((m) => m.ZoningComponent)
      },
      {
        path: "data",
        loadComponent: () =>
          import("./features/data-management/data-management.component").then((m) => m.DataManagementComponent)
      }
    ]
  },
  { path: "**", redirectTo: "" }
];

