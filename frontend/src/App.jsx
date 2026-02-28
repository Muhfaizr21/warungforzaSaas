import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import PreOrderPage from './pages/PreOrder';
import ReadyStockPage from './pages/ReadyStock';
import ContactPage from './pages/Contact';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardOverview from './pages/admin/DashboardOverview';
import ProductList from './pages/admin/ProductList';
import OrderList from './pages/admin/OrderList';
import UserList from './pages/admin/UserList';
import FinanceDashboard from './pages/admin/FinanceDashboard';
import COAManagement from './pages/admin/COAManagement';
import Settings from './pages/admin/Settings';
import MarketingDashboard from './pages/admin/MarketingDashboard';
import AuditLogs from './pages/admin/AuditLogs';
import ProductForm from './pages/admin/ProductForm';
import TaxonomyManagement from './pages/admin/TaxonomyManagement';
import OrderDetail from './pages/admin/OrderDetail';
import CreateOrder from './pages/admin/CreateOrder';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import OrderDetailUser from './pages/OrderDetail';
import PaymentSimulator from './pages/PaymentSimulator';
import PaymentCallback from './pages/PaymentCallback';
import PaymentPage from './pages/PaymentPage';
import CheckoutSuccess from './pages/CheckoutSuccess';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import ClearCart from './components/ClearCart';
import Wallet from './pages/Wallet';
import Procurement from './pages/admin/Procurement';
import PurchaseOrderForm from './pages/admin/PurchaseOrderForm';
import BlogIndex from './pages/Blog/BlogIndex';
import BlogDetail from './pages/Blog/BlogDetail';
import BlogList from './pages/admin/BlogList';
import BlogForm from './pages/admin/BlogForm';
import Inbox from './pages/admin/Inbox';
import SupplierList from './pages/admin/SupplierList';
import POS from './pages/admin/POS';
import QuickShip from './pages/admin/orders/QuickShip';
import SearchResults from './pages/admin/SearchResults';
import AnnouncementBar from './components/AnnouncementBar';
import RoleManagement from './pages/admin/rbac/RoleManagement';
import SystemUsers from './pages/admin/rbac/SystemUsers';
import MainLayout from './pages/layouts/MainLayout';
import AuthLayout from './pages/layouts/AuthLayout';
import PackingSlip from './pages/admin/orders/PackingSlip';
import ShippingLabel from './pages/admin/orders/ShippingLabel';
import VoucherManagement from './pages/admin/VoucherManagement';
import ThemePage from './pages/admin/ThemePage';
import EmailTemplatePage from './pages/admin/EmailTemplatePage';
import ShippingManagement from './pages/admin/ShippingManagement';
import StaticPage from './pages/StaticPage';
import { PrivateRoute, AdminRoute } from './components/PrivateRoute';
import NotFound from './pages/NotFound';

function AppContent() {
  const { theme } = useTheme();
  return (
    <div className="min-h-screen text-white font-sans" style={{ backgroundColor: theme?.theme_bg_color || '#030303' }}>
      <Routes>
        {/* Public Routes with Navbar & Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/preorder" element={<PreOrderPage />} />
          <Route path="/readystock" element={<ReadyStockPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />

          {/* Information & Static Pages */}
          <Route path="/how-to-buy" element={<StaticPage />} />
          <Route path="/shipping" element={<StaticPage />} />
          <Route path="/faq" element={<StaticPage />} />
          <Route path="/privacy" element={<StaticPage />} />
          <Route path="/terms" element={<StaticPage />} />
          <Route path="/accessories" element={<ReadyStockPage />} />

          {/* Semi-public: cart doesn't need auth, but user-specific pages do */}
          <Route path="/cart" element={<Cart />} />

          {/* 🔒 PROTECTED: Customer must be logged in */}
          <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
          <Route path="/order/:id" element={<PrivateRoute><OrderDetailUser /></PrivateRoute>} />
          <Route path="/checkout/success" element={<PrivateRoute><CheckoutSuccess /></PrivateRoute>} />
        </Route>

        {/* Auth & Standalone Routes (No Navbar/Footer) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Payment Routes (Standalone) */}
          <Route path="/payment/simulate" element={<PaymentSimulator />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/payment/:invoiceId" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
        </Route>

        {/* 🔒 PROTECTED ADMIN ROUTES */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />

          {/* RBAC (Role-Based Access Control) */}
          <Route path="rbac/roles" element={<RoleManagement />} />
          <Route path="rbac/staff" element={<SystemUsers />} />
          <Route path="audit" element={<AuditLogs />} />

          {/* Operational Modules */}
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/edit/:id" element={<ProductForm />} />
          <Route path="taxonomy" element={<TaxonomyManagement />} />
          <Route path="pos" element={<POS />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/quick-ship" element={<QuickShip />} />
          <Route path="orders/create" element={<Navigate to="/admin/pos" replace />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="procurement/new" element={<PurchaseOrderForm />} />
          <Route path="procurement/:id" element={<PurchaseOrderForm />} />
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="users" element={<UserList />} />
          <Route path="announcements" element={<MarketingDashboard tab="announcements" />} />
          <Route path="newsletter" element={<MarketingDashboard tab="newsletter" />} />
          <Route path="wishlist" element={<MarketingDashboard tab="wishlist" />} />
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="finance/coa" element={<COAManagement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="shipping" element={<ShippingManagement />} />

          {/* Blog Admin */}
          <Route path="blog" element={<BlogList />} />
          <Route path="blog/new" element={<BlogForm />} />
          <Route path="blog/edit/:id" element={<BlogForm />} />

          {/* Messages */}
          <Route path="inbox" element={<Inbox />} />
          <Route path="search" element={<SearchResults />} />

          {/* Vouchers */}
          <Route path="vouchers" element={<VoucherManagement />} />
          {/* Theme Studio */}
          <Route path="theme" element={<ThemePage />} />
          {/* Email Templates */}
          <Route path="email-templates" element={<EmailTemplatePage />} />
        </Route>

        {/* Printable Routes (No Layout) */}
        <Route path="/admin/orders/:id/packing-slip" element={<AdminRoute><PackingSlip /></AdminRoute>} />
        <Route path="/admin/orders/:id/shipping-label" element={<AdminRoute><ShippingLabel /></AdminRoute>} />

        {/* 404 - Proper not found page instead of silent redirect */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <CartProvider>
              <ToastProvider>
                <ClearCart />
                <AppContent />
              </ToastProvider>
            </CartProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
