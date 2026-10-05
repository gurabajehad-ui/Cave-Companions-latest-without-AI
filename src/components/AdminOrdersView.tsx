import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Eye, CheckCircle, Truck, XCircle, Trash2, Filter, AlertCircle, X, Clock, Calendar } from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';

export const AdminOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Advanced Filters State
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('ALL');
  const [marketTypeFilter, setMarketTypeFilter] = useState<'ALL' | 'NATIONWIDE' | 'LOCAL'>('ALL');
  const [shopsList, setShopsList] = useState<any[]>([]);

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateFrom, dateTo]);

  const fetchShops = async () => {
    try {
      const res = await api.getAdminShops();
      if (res.success) {
        setShopsList(res.shops || []);
      }
    } catch (err) {
      console.error('Error fetching admin shops:', err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOrders({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const openOrderDetail = async (order: Order) => {
    setStatusMessage(null);
    try {
      const res = await api.getAdminOrderDetail(order.id);
      if (res.success) {
        setSelectedOrder(res.order);
        setAdminNotes(res.order.adminNotes || '');
        setModalOpen(true);
      }
    } catch (err) {
      setSelectedOrder(order);
      setModalOpen(true);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.updateAdminOrderStatus(orderId, {
        status: newStatus,
        adminNotes: adminNotes.trim() || undefined
      });

      if (res.success) {
        const updated = res.order || (selectedOrder ? { ...selectedOrder, status: newStatus as any } : null);
        if (updated) {
          setSelectedOrder(updated);
        }
        setStatusMessage({
          type: 'success',
          text: `স্ট্যাটাস সফলভাবে '${newStatus === 'APPROVED' ? 'অনুমোদিত' : newStatus === 'DELIVERED' ? 'ডেলিভার্ড' : newStatus === 'REJECTED' ? 'প্রত্যাখ্যাত' : 'বাতিল'}' করা হয়েছে।`
        });
        fetchOrders();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।'
        });
      }
    } catch (err: any) {
      console.error('Update status error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.deleteAdminOrder(orderId);
      if (res.success) {
        setModalOpen(false);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'অর্ডার মুছতে সমস্যা হয়েছে।'
        });
      }
    } catch (err: any) {
      console.error('Delete order error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'অর্ডার মুছতে সমস্যা হয়েছে।'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaiveDelivery = async (orderId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.adminWaiveDelivery(orderId);
      if (res.success) {
        if (res.order) {
          setSelectedOrder(res.order);
        }
        setStatusMessage({
          type: 'success',
          text: 'ন্যাশনাল মার্কেট অর্ডারের ডেলিভারি চার্জ সফলভাবে মওকুফ করা হয়েছে।'
        });
        fetchOrders();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'ডেলিভারি চার্জ মওকুফ করতে সমস্যা হয়েছে।'
        });
      }
    } catch (err: any) {
      console.error('Waive delivery error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'ডেলিভারি চার্জ মওকুফ করতে সমস্যা হয়েছে।'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">অপেক্ষমান (Pending)</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">অনুমোদিত (Approved)</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">ডেলিভারি সম্পন্ন (Delivered)</span>;
      case 'REJECTED':
      case 'CANCELLED':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full">বাতিল / প্রত্যাখ্যাত</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (marketTypeFilter !== 'ALL' && (order.orderType || 'NATIONWIDE') !== marketTypeFilter) return false;
    if (selectedShopId === 'ALL') return true;
    return order.items?.some(item => String(item.shopId) === selectedShopId);
  });

  const nationalCount = orders.filter(o => (o.orderType || 'NATIONWIDE') === 'NATIONWIDE').length;
  const localCount = orders.filter(o => (o.orderType || 'NATIONWIDE') === 'LOCAL').length;

  return (
    <div className="space-y-4">
      {/* Header & Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">অনলাইন অর্ডার ব্যবস্থাপনা (Order Management)</h3>
            <p className="text-xs text-slate-500">গ্রাহকদের ক্যাশ অন ডেলিভারি অর্ডার যাচাই, অনুমোদন ও ডেলিভারি আপডেট করুন।</p>
          </div>
 
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'PENDING', 'APPROVED', 'DELIVERED', 'REJECTED'].map((status, sIdx) => (
              <button
                key={`aov-st-${status}-${sIdx}`}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {status === 'ALL' ? 'সকল' : status === 'PENDING' ? 'অপেক্ষমান' : status === 'APPROVED' ? 'অনুমোদিত' : status === 'DELIVERED' ? 'ডেলিভার্ড' : 'বাতিল'}
              </button>
            ))}
          </div>
        </div>

        {/* Market Category Selector */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setMarketTypeFilter('ALL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              marketTypeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সকল মার্কেট ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setMarketTypeFilter('NATIONWIDE')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              marketTypeFilter === 'NATIONWIDE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            জাতীয় মার্কেট / কুরিয়ার ({nationalCount})
          </button>
          <button
            type="button"
            onClick={() => setMarketTypeFilter('LOCAL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              marketTypeFilter === 'LOCAL'
                ? 'bg-cyan-700 text-white shadow-xs'
                : 'text-cyan-800 hover:bg-cyan-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            লোকাল মার্কেট / CC রাইডার ({localCount})
          </button>
        </div>
 
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                console.log('Orders search input onChange fired. Value:', e.target.value);
                setSearchQuery(e.target.value);
              }}
              onFocus={e => {
                console.log('Orders search input onFocus fired');
              }}
              onKeyDown={e => {
                console.log('Orders search input onKeyDown fired. Key:', e.key);
              }}
              placeholder="অর্ডার নং, গ্রাহকের নাম, ফোন নম্বর, শপ বা পণ্যের নাম দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  // Fetch default list immediately after clearing
                  api.getAdminOrders({
                    status: statusFilter === 'ALL' ? undefined : statusFilter
                  }).then(res => {
                    if (res.success) {
                      setOrders(res.orders || []);
                    }
                  });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="অনুসন্ধান মুছুন"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            সার্চ
          </button>
        </form>

        {/* Advanced Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Shop Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">পার্টনার শপ ফিল্টার (Partner Shop)</label>
            <select
              value={selectedShopId}
              onChange={e => setSelectedShopId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">সকল শপ (All Shops)</option>
              {shopsList.map((shop, shIdx) => (
                <option key={`aov-shp-${shop.id || 'sh'}-${shIdx}`} value={String(shop.id)}>
                  {shop.nameBn || shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              তারিখ হতে (From Date)
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              তারিখ পর্যন্ত (To Date)
            </label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
              {(searchQuery || dateFrom || dateTo || selectedShopId !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDateFrom('');
                    setDateTo('');
                    setSelectedShopId('ALL');
                    // Fetch default list immediately
                    api.getAdminOrders({
                      status: statusFilter === 'ALL' ? undefined : statusFilter
                    }).then(res => {
                      if (res.success) {
                        setOrders(res.orders || []);
                      }
                    });
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0"
                  title="ফিল্টার রিসেট করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
 
      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">অর্ডারের তালিকা লোড হচ্ছে...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">কোনো অর্ডার পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-400">নির্বাচিত ফিল্টারে কোনো অর্ডার রেকর্ড নেই।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">অর্ডার নং</th>
                  <th className="py-3 px-4">মার্কেট টাইপ</th>
                  <th className="py-3 px-4">গ্রাহক</th>
                  <th className="py-3 px-4">ঠিকানা</th>
                  <th className="py-3 px-4 text-right">পণ্যের মূল্য</th>
                  <th className="py-3 px-4 text-right">ডেলিভারি চার্জ</th>
                  <th className="py-3 px-4 text-right">কুপন</th>
                  <th className="py-3 px-4 text-right">সর্বমোট (COD)</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order, oIdx) => (
                  <tr key={`aov-ord-${order.id || 'o'}-${oIdx}`} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">#{order.orderNumber}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (order.orderType || 'NATIONWIDE') === 'LOCAL'
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {(order.orderType || 'NATIONWIDE') === 'LOCAL' ? 'লোকাল (CC রাইডার)' : 'জাতীয় (ন্যাশনাল)'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{order.customerName}</div>
                      <div className="text-[11px] text-slate-500">{order.customerPhone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{order.deliveryAddress}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">৳{order.productTotalPayable ?? 0}</td>
                    <td className="py-3 px-4 text-right text-slate-600">৳{order.deliveryCharge ?? 0}</td>
                    <td className="py-3 px-4 text-right text-rose-600 font-bold">
                      {order.couponCode ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 font-medium px-1 bg-slate-100 rounded">{order.couponCode}</span>
                          <span>-৳{order.couponDiscountAmount ?? 0}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">৳০</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">৳{order.totalCodAmount ?? 0}</td>
                    <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(order.createdAt).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openOrderDetail(order)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        বিস্তারিত
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {modalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">অর্ডার #{selectedOrder.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    (selectedOrder.orderType || 'NATIONWIDE') === 'LOCAL'
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {(selectedOrder.orderType || 'NATIONWIDE') === 'LOCAL' ? 'লোকাল মার্কেট (CC রাইডার)' : 'জাতীয় মার্কেট (কুরিয়ার)'}
                  </span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Customer Details */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">গ্রাহক ও ডেলিভারি তথ্য</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-600">
                    <p><strong className="text-slate-900">নাম:</strong> {selectedOrder.customerName}</p>
                    <p><strong className="text-slate-900">মোবাইল:</strong> {selectedOrder.customerPhone}</p>
                    <p className="sm:col-span-2"><strong className="text-slate-900">ঠিকানা:</strong> {selectedOrder.deliveryAddress}</p>
                    {selectedOrder.deliveryNotes && (
                      <p className="sm:col-span-2"><strong className="text-slate-900">নোট:</strong> {selectedOrder.deliveryNotes}</p>
                    )}
                  </div>
                </div>

                {/* Ordered Items with Financial Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">অর্ডারের পণ্যসমূহ ও হিসাব</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, itmIdx) => (
                      <div
                        key={`aov-itm-${item.id || 'i'}-${itmIdx}`}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">{item.shopName}</span>
                            <h5 className="font-bold text-slate-900 text-sm">{item.productName}</h5>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              মূল্য: ৳{item.originalPrice} × {item.quantity} = ৳{item.originalPrice * item.quantity}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">গ্রাহকের প্রদেয়</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              ৳{item.customerProductPayable}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown info pill */}
                        <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block">টোকেন ছাড়:</span>
                            <span className="font-bold text-emerald-700">
                              {item.tokenType ? `${item.tokenType} (৳${item.tokenDiscountAmount * item.quantity})` : 'কোনো ছাড় নেই'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">কমিশন রেট:</span>
                            <span className="font-bold text-slate-800">{item.commissionRate}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">শপ পাবে:</span>
                            <span className="font-bold text-slate-800">৳{item.shopReceivable * item.quantity}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">CC নেট ইনকাম:</span>
                            <span className="font-bold text-emerald-700">৳{item.netIncome * item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Totals */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>পণ্যের মূল মূল্য:</span>
                    <span>৳{selectedOrder.productTotalOriginal ?? 0}</span>
                  </div>
                  {(selectedOrder.productTotalDiscount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>টোকেন ডিসকাউন্ট সুবিধা:</span>
                      <span>- ৳{selectedOrder.productTotalDiscount ?? 0}</span>
                    </div>
                  )}
                  {selectedOrder.couponCode && (selectedOrder.couponDiscountAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-amber-400 font-semibold">
                      <span>কুপন ডিসকাউন্ট সুবিধা ({selectedOrder.couponCode}):</span>
                      <span>- ৳{selectedOrder.couponDiscountAmount ?? 0}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span>পণ্যের প্রদেয় মূল্য:</span>
                    <span className="font-bold text-white">৳{selectedOrder.productTotalPayable ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-amber-300 border-t border-slate-800 pt-1.5 items-center">
                    <div>
                      <span>ডেলিভারি চার্জ (আলাদা রক্ষিত):</span>
                      {selectedOrder.deliveryWaived && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold rounded">
                          মওকুফকৃত (Waived)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${selectedOrder.deliveryWaived ? 'line-through text-slate-500' : ''}`}>
                        ৳{selectedOrder.deliveryWaived ? (selectedOrder.originalDeliveryCharge || 0) : (selectedOrder.deliveryCharge ?? 0)}
                      </span>
                      {selectedOrder.deliveryWaived && (
                        <span className="font-bold text-emerald-400">৳০</span>
                      )}
                      {!selectedOrder.deliveryWaived && (selectedOrder.orderType || 'NATIONWIDE') !== 'LOCAL' && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'REJECTED' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleWaiveDelivery(selectedOrder.id)}
                          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          চার্জ মওকুফ করুন
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-extrabold text-white">
                    <span>সর্বমোট ক্যাশ অন ডেলিভারি (COD):</span>
                    <span className="text-emerald-400 text-base font-black">৳{selectedOrder.totalCodAmount ?? 0}</span>
                  </div>
                </div>

                {/* Inline Status Message */}
                {statusMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {statusMessage.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{statusMessage.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusMessage(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Status change actions */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                    স্ট্যাটাস পরিবর্তন অ্যাকশন
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedOrder.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'APPROVED')}
                          className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          অর্ডার অনুমোদন করুন (Approve)
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          ডেলিভার্ড (Delivered)
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'REJECTED')}
                          className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          প্রত্যাখ্যান (Reject)
                        </button>
                      </>
                    )}

                    {selectedOrder.status === 'APPROVED' && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          ডেলিভার্ড (Mark Delivered)
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                          className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          বাতিল করুন
                        </button>
                      </>
                    )}

                    {selectedOrder.status === 'DELIVERED' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ডেলিভারি সম্পন্ন (Delivered) — অনলাইন হিসাবে অন্তর্ভুক্ত
                        </span>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'APPROVED')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                        >
                          অনুমোদনে ফেরত নেন
                        </button>
                      </div>
                    )}

                    {(selectedOrder.status === 'REJECTED' || selectedOrder.status === 'CANCELLED') && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'APPROVED')}
                          className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          পুনরায় অনুমোদন (Re-Approve)
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          ডেলিভার্ড (Delivered)
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      className="ml-auto px-3 py-2 text-rose-600 hover:bg-rose-50 active:scale-95 rounded-xl transition font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      মুছুন
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
