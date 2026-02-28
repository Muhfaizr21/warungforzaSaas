import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { HiOutlineCube, HiOutlineUsers, HiOutlineShoppingCart, HiOutlineChevronRight } from 'react-icons/hi';
import Badge from './components/ui/Badge';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');

    const [results, setResults] = useState({
        products: [],
        orders: [],
        customers: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (query) {
            performSearch();
        }
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const [productsData, ordersData, customersData] = await Promise.all([
                adminService.getProducts({ search: query, limit: 5 }),
                adminService.getOrders({ search: query, limit: 5 }),
                adminService.getCustomers({ search: query, limit: 5 })
            ]);

            setResults({
                products: productsData.data || [],
                orders: ordersData.data || [],
                customers: customersData.data || []
            });
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
                Searching for "{query}"...
            </div>
        );
    }

    const hasResults = results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Search Results</h2>
                <p className="text-gray-500">Showing results for <span className="font-bold text-gray-900 dark:text-white">"{query}"</span></p>
            </div>

            {!hasResults && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-lg font-medium">No results found</p>
                    <p className="text-sm">Try using different keywords</p>
                </div>
            )}

            {/* Products Results */}
            {results.products.length > 0 && (
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                            <HiOutlineCube className="text-brand-500" /> Products ({results.products.length})
                        </h3>
                        {results.products.length >= 5 && (
                            <Link to={`/admin/products?search=${query}`} className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                                View all <HiOutlineChevronRight />
                            </Link>
                        )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {results.products.map(product => (
                            <Link key={product.id} to={`/admin/products/edit/${product.id}`} className="block py-3 hover:bg-gray-50 dark:hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                        {product.images?.[0] && (
                                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{product.name}</h4>
                                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <Badge color={product.stock > 0 ? "success" : "error"}>{product.stock > 0 ? "In Stock" : "Out of Stock"}</Badge>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Orders Results */}
            {results.orders.length > 0 && (
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                            <HiOutlineShoppingCart className="text-brand-500" /> Orders ({results.orders.length})
                        </h3>
                        {results.orders.length >= 5 && (
                            <Link to={`/admin/orders?search=${query}`} className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                                View all <HiOutlineChevronRight />
                            </Link>
                        )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {results.orders.map(order => (
                            <Link key={order.id} to={`/admin/orders/${order.id}`} className="block py-3 hover:bg-gray-50 dark:hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{order.order_number}</h4>
                                        <p className="text-xs text-gray-500">{order.user?.full_name || 'Guest'} • Rp {order.total_amount?.toLocaleString()}</p>
                                    </div>
                                    <Badge variant="light" color={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'}>
                                        {order.status}
                                    </Badge>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Customers Results */}
            {results.customers.length > 0 && (
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                            <HiOutlineUsers className="text-brand-500" /> Customers ({results.customers.length})
                        </h3>
                        {results.customers.length >= 5 && (
                            <Link to={`/admin/users?search=${query}`} className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                                View all <HiOutlineChevronRight />
                            </Link>
                        )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {results.customers.map(customer => (
                            <div key={customer.id} className="py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-xs">
                                        {customer.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{customer.full_name}</h4>
                                        <p className="text-xs text-gray-500">{customer.email}</p>
                                    </div>
                                </div>
                                <Badge variant="light" color={customer.status === 'active' ? 'success' : 'error'}>{customer.status}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchResults;
