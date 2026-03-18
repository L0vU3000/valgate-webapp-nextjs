import { createBrowserRouter } from "react-router";
import { ShellLayout } from "./components/layout/ShellLayout";
import { HomePage } from "./pages/HomePage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SuccessionPage } from "./pages/SuccessionPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MapPage } from "./pages/MapPage";
import { PropertySpatialPage } from "./pages/PropertySpatialPage";
import { PropertyDocumentsPage } from "./pages/property/PropertyDocumentsPage";
import { PropertyOwnershipPage } from "./pages/property/PropertyOwnershipPage";
import { PropertyRentalPage } from "./pages/property/PropertyRentalPage";
import { PropertySafetyPage } from "./pages/property/PropertySafetyPage";
import { PropertyValuationPage } from "./pages/property/PropertyValuationPage";
import { PropertyOverviewRedirect } from "./pages/property/PropertyOverviewRedirect";
import { AddPropertyPage } from "./pages/AddPropertyPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/portfolio",
    Component: ShellLayout,
    children: [
      { index: true, Component: PortfolioPage },
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
    path: "/succession",
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
    path: "/map",
    Component: ShellLayout,
    children: [
      { index: true, Component: MapPage },
    ],
  },
  {
    path: "/property/:id",
    Component: ShellLayout,
    children: [
      { index: true, Component: PropertyOverviewRedirect },
      { path: "overview", Component: PropertyOwnershipPage },
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
]);