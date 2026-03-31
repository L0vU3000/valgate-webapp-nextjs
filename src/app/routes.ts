import { createBrowserRouter } from "react-router";
import { ShellLayout } from "./components/layout/ShellLayout";
import { HomePage } from "./pages/HomePage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SuccessionPage } from "./pages/SuccessionPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PropertySpatialPage } from "./pages/PropertySpatialPage";
import { PropertyDocumentsPage } from "./pages/property/PropertyDocumentsPage";
import { PropertyOwnershipPage } from "./pages/property/PropertyOwnershipPage";
import { PropertyOverviewPage } from "./pages/property/PropertyOverviewPage";
import { PropertyRentalPage } from "./pages/property/PropertyRentalPage";
import { PropertySafetyPage } from "./pages/property/PropertySafetyPage";
import { PropertyValuationPage } from "./pages/property/PropertyValuationPage";
import { PropertyOverviewRedirect } from "./pages/property/PropertyOverviewRedirect";
import { AddPropertyPage } from "./pages/AddPropertyPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RentalDashboardPage } from "./pages/RentalDashboardPage";
import { ProfessionalDirectoryPage } from "./pages/ProfessionalDirectoryPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/",
    Component: ShellLayout,
    children: [
      { index: true, Component: HomePage },
    ],
  },
  {
    path: "/portfolio",
    Component: ShellLayout,
    children: [
      { index: true, Component: PortfolioPage },
    ],
  },
  {
    path: "/directory",
    Component: ShellLayout,
    children: [
      { index: true, Component: ProfessionalDirectoryPage },
    ],
  },
  {
    path: "/analytics",
    Component: ShellLayout,
    children: [
      { index: true, Component: AnalyticsPage },
    ],
  },
  {
    path: "/estate-planning",
    Component: ShellLayout,
    children: [
      { index: true, Component: SuccessionPage },
    ],
  },
  {
    path: "/settings",
    Component: ShellLayout,
    children: [
      { index: true, Component: SettingsPage },
    ],
  },
  {
    path: "/rental",
    Component: ShellLayout,
    children: [
      { index: true, Component: RentalDashboardPage },
    ],
  },
  {
    path: "/property/:id",
    Component: ShellLayout,
    children: [
      { index: true, Component: PropertyOverviewRedirect },
      { path: "overview", Component: PropertyOverviewPage },
      { path: "documents", Component: PropertyDocumentsPage },
      { path: "safety", Component: PropertySafetyPage },
      { path: "spatial", Component: PropertySpatialPage },
      { path: "ownership", Component: PropertyOwnershipPage },
      { path: "rental", Component: PropertyRentalPage },
      { path: "valuation", Component: PropertyValuationPage },
      { path: "surrounding", Component: PropertySpatialPage },
    ],
  },
  {
    path: "/add-property",
    Component: ShellLayout,
    children: [
      { index: true, Component: AddPropertyPage },
    ],
  },
  {
    path: "/profile",
    Component: ShellLayout,
    children: [
      { index: true, Component: ProfilePage },
    ],
  },
]);