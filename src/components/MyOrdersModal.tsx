import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Clock, CheckCircle2, AlertCircle, Truck, XCircle, ChevronDown, ChevronUp, FileText, Trash2, Bike } from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';
import { DigitalCashMemoModal } from './DigitalCashMemoModal';
import { LocalOrderTracking } from './LocalOrderTracking';
import { useLanguage } from '../context/LanguageContext';
import { toBnNumber } from '../data/prayerConfig';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const formatNum = (val: number | string) => language === 'bn' ? toBnNumber(val) : String(val);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedMemoOrder, setSelectedMemoOrder] = useState<Order | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      const interval = setInterval(() => {
        fetchOrders(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.getMyOrders();
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err: any) {
      console.error('Error fetching my orders:', err);
      setError(err.message || (language === 'bn' ? 'অর্ডারের তথ্য লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load order information.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে এই অর্ডারটি আপনার ইতিহাস থেকে মুছে ফেলতে চান?' : 'Are you sure you want to delete this order from your history?')) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const res = await api.deleteUserOrderHistory(orderId);
      if (res.success) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        alert(res.message || 'অর্ডার মুছতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      console.error('Error deleting user order:', err);
      alert(err.message || 'অর্ডার মুছতে সমস্যা হয়েছে।');
    } finally {
      setDeletingOrderId(null);
    }
  };

  if (!isOpen) return null;

  const isOrderDeletable = (_order: Order) => {
    return true;
  };

  const getStatusBadge = (orderOrStatus: Order | string) => {
    const status = typeof orderOrStatus === 'string' ? orderOrStatus : (orderOrStatus.status || 'PENDING');
    const riderStatus = typeof orderOrStatus === 'object' ? (orderOrStatus.riderStatus || '') : '';

    const normStatus = (status || '').toUpperCase();
    const normRiderStatus = (riderStatus || '').toUpperCase();

    if (['DELIVERED', 'DONE', 'COMPLETED'].includes(normStatus) || ['DELIVERED', 'DONE'].includes(normRiderStatus)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
          <Truck className="w-3 h-3" />
          {language === 'bn' ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}
        </span>
      );
    }

    if (normRiderStatus === 'PICKED_UP' || normRiderStatus === 'PICKING_UP' || normRiderStatus === 'ON_THE_WAY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
          <Truck className="w-3 h-3" />
          {language === 'bn' ? 'পিকআপ সম্পন্ন' : 'Picked Up'}
        </span>
      );
    }

    if (normRiderStatus === 'ACCEPTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          {language === 'bn' ? 'রাইডার নির্ধারিত' : 'Rider Assigned'}
        </span>
      );
    }

    if (normStatus === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          {language === 'bn' ? 'অনুমোদিত' : 'Approved'}
        </span>
      );
    }

    if (['PRODUCT_BACK', 'RETURNED'].includes(normStatus) || ['PRODUCT_BACK', 'RETURNED'].includes(normRiderStatus)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-full">
          <XCircle className="w-3 h-3" />
          {language === 'bn' ? 'পণ্য ফেরত' : 'Returned'}
        </span>
      );
    }

    if (['REJECTED', 'CANCELLED'].includes(normStatus) || ['REJECTED', 'CANCELLED'].includes(normRiderStatus)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full">
          <XCircle className="w-3 h-3" />
          {language === 'bn' ? 'বাতিল' : 'Cancelled'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
        <Clock className="w-3 h-3" />
        {language === 'bn' ? 'অপেক্ষমান' : 'Pending'}
      </span>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'bn' ? 'আমার সকল অর্ডার' : 'My Orders'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {language === 'bn' ? 'ক্যাশ অন ডেলিভারি কেনাকাটার ইতিহাস' : 'Cash on delivery shopping history'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 animate-bounce text-emerald-500 opacity-60" />
                {language === 'bn' ? 'অর্ডারের তালিকা লোড হচ্ছে...' : 'Loading orders...'}
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                <p className="text-xs text-rose-700">{error}</p>
                <button
                  onClick={() => fetchOrders()}
                  className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg"
                >
                  {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">
                  {language === 'bn' ? 'আপনার কোনো অর্ডার পাওয়া যায়নি' : 'No orders found'}
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'bn' ? 'আপনি এখনও অনলাইন মার্কেটপ্লেসে কোনো অর্ডার করেননি।' : 'You have not placed any orders in the online marketplace yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order, oIdx) => {
                  const isExpanded = expandedOrderId === order.id;
                  const dateStr = new Date(order.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  const orderTotalPayable = order.totalCodAmount ?? 0;
                  const orderProductPayable = order.productTotalPayable ?? 0;
                  const orderDeliveryCharge = order.deliveryCharge ?? 0;

                  return (
                    <div
                      key={`my-ord-${order.id || 'ord'}-${oIdx}`}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden transition hover:border-slate-300"
                    >
                      {/* Order Card Summary */}
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="p-4 cursor-pointer flex items-center justify-between gap-3 bg-slate-50/40 hover:bg-slate-50 transition"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900">
                              #{order.orderNumber}
                            </span>
                            {getStatusBadge(order)}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {language === 'bn' 
                              ? `তারিখ: ${dateStr} • ${formatNum(order.items?.length || 0)} টি আইটেম`
                              : `Date: ${dateStr} • ${formatNum(order.items?.length || 0)} item(s)`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-medium text-slate-500 block">
                              {language === 'bn' ? 'মোট প্রদেয়' : 'Total Payable'}
                            </span>
                            <span className="text-sm font-extrabold text-emerald-700">
                              ৳{language === 'bn' ? Number(orderTotalPayable).toLocaleString('bn-BD') : Number(orderTotalPayable).toLocaleString('en-US')}
                            </span>
                          </div>
                          <div className="p-1 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Order Items */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              {language === 'bn' ? 'অর্ডারকৃত পণ্যসমূহ' : 'Ordered Items'}
                            </span>
                            {order.items?.map((item, itmIdx) => {
                              const qty = item.quantity || 1;
                              const itemSubtotal = item.customerProductPayable ?? (item.originalPrice * qty);
                              const unitPrice = qty > 0 ? (itemSubtotal / qty) : item.originalPrice;

                              return (
                                <div
                                  key={`my-ord-itm-${item.id || 'itm'}-${itmIdx}`}
                                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
                                >
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">{item.shopName}</span>
                                    <h5 className="font-bold text-slate-900">{item.productName}</h5>
                                    {item.tokenType && item.tokenType !== 'NONE' && (
                                      <span className="text-[10px] text-emerald-700 font-semibold block">
                                        {language === 'bn' ? `টোকেন ডিসকাউন্ট: ${item.tokenType} (-৳${formatNum(item.tokenDiscountAmount || 0)})` : `Token Discount: ${item.tokenType} (-৳${formatNum(item.tokenDiscountAmount || 0)})`}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0 ml-2">
                                    <span className="font-bold text-slate-900 block">
                                      ৳{formatNum(Math.round(unitPrice))} × {formatNum(qty)}
                                    </span>
                                    <span className="text-xs font-extrabold text-emerald-700">
                                      = ৳{formatNum(Math.round(itemSubtotal))}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Financial Details */}
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs text-slate-600">
                            <div className="flex justify-between">
                              <span>{language === 'bn' ? 'পণ্যের মূল্য:' : 'Product Price:'}</span>
                              <span className="font-semibold text-slate-800">৳{formatNum(orderProductPayable)}</span>
                            </div>
                            {order.couponCode && (order.couponDiscountAmount || 0) > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>{language === 'bn' ? `কুপন ডিসকাউন্ট (${order.couponCode}):` : `Coupon Discount (${order.couponCode}):`}</span>
                                <span className="font-semibold">-৳{formatNum(order.couponDiscountAmount || 0)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>{language === 'bn' ? 'ডেলিভারি চার্জ:' : 'Delivery Charge:'}</span>
                              <span className="font-semibold text-slate-800">৳{formatNum(orderDeliveryCharge)}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900">
                              <span>{language === 'bn' ? 'সর্বমোট (ক্যাশ অন ডেলিভারি):' : 'Total (Cash On Delivery):'}</span>
                              <span className="text-emerald-700">৳{formatNum(orderTotalPayable)}</span>
                            </div>
                          </div>

                          {/* Delivery info & Actions */}
                          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                            <p><strong className="text-slate-700">{language === 'bn' ? 'প্রাপকের নাম:' : 'Recipient Name:'}</strong> {order.customerName}</p>
                            <p><strong className="text-slate-700">{language === 'bn' ? 'মোবাইল:' : 'Phone:'}</strong> {formatNum(order.customerPhone)}</p>
                            <p><strong className="text-slate-700">{language === 'bn' ? 'ঠিকানা:' : 'Address:'}</strong> {order.deliveryAddress}</p>
                            {order.deliveryNotes && (
                              <p><strong className="text-slate-700">{language === 'bn' ? 'নোট:' : 'Notes:'}</strong> {order.deliveryNotes}</p>
                            )}
                          </div>

                          {/* Verification Codes for Customer */}
                          {(order.deliveryOtp || order.rejectionCode) && (
                            <div className="space-y-2">
                              {order.deliveryOtp && (
                                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                                  <span className="text-[11px] font-bold text-emerald-900 block">
                                    {language === 'bn' ? 'ডেলিভারি যাচাইকরণ কোড (Delivery Verification Code)' : 'Delivery Verification Code'}
                                  </span>
                                  <div className="p-2 bg-white rounded border border-emerald-100 flex flex-col items-center text-center">
                                    <span className="text-[10px] text-slate-500">
                                      {language === 'bn' ? 'পণ্য গ্রহণের সময় রাইডারকে এই কোডটি প্রদান করুন:' : 'Provide this code to rider upon delivery:'}
                                    </span>
                                    <span className="font-mono font-bold text-emerald-600 text-base tracking-wider mt-0.5">{order.deliveryOtp}</span>
                                  </div>
                                </div>
                              )}

                              {order.rejectionCode && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                                  <span className="text-[11px] font-bold text-rose-900 block flex items-center gap-1">
                                    {language === 'bn' ? 'পার্সেল রিজেক্ট কোড (পণ্য নিতে অস্বীকার)' : 'Parcel Rejection Code'}
                                  </span>
                                  <div className="p-2 bg-white rounded border border-rose-200 flex flex-col items-center text-center">
                                    <span className="text-[10px] text-slate-500">
                                      {language === 'bn' ? 'রাইডার রিজেক্ট বাটনে চাপ দেওয়ার পর এই কোডটি তৈরি হয়েছে। পণ্য না নিতে চাইলে রাইডারকে এই কোডটি প্রদান করুন:' : 'Provide this code to rider:'}
                                    </span>
                                    <span className="font-mono font-black text-rose-600 text-lg tracking-widest mt-1">{order.rejectionCode}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            {isOrderDeletable(order) ? (
                              <button
                                onClick={(e) => handleDeleteOrder(order.id, e)}
                                disabled={deletingOrderId === order.id}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                title={language === 'bn' ? 'অর্ডার হিস্ট্রি মুছে ফেলুন' : 'Delete Order History'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {deletingOrderId === order.id 
                                  ? (language === 'bn' ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...') 
                                  : (language === 'bn' ? 'হিস্ট্রি থেকে মুছে ফেলুন' : 'Delete from History')}
                              </button>
                            ) : (
                              <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                <span>⏳</span>
                                {language === 'bn' 
                                  ? 'অর্ডার সম্পন্ন বা ফেরত হলে হিস্ট্রি মুছতে পারবেন' 
                                  : 'History can be deleted once order is completed or returned'}
                              </span>
                            )}

                            <div className="flex items-center gap-2 flex-wrap ml-auto">
                              {order.orderType === 'LOCAL' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTrackingOrder(order);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title={language === 'bn' ? 'ম্যাপে লাইভ ট্র্যাক করুন' : 'Live Track Order'}
                                >
                                  <Bike className="w-3.5 h-3.5" />
                                  {language === 'bn' ? 'লাইভ ট্র্যাক করুন' : 'Live Tracking'}
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMemoOrder(order);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {language === 'bn' ? 'ডিজিটাল ক্যাশ মেমো / ইনভয়েস' : 'Digital Cash Memo / Invoice'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Digital Cash Memo Modal */}
      {selectedMemoOrder && (
        <DigitalCashMemoModal
          isOpen={!!selectedMemoOrder}
          onClose={() => setSelectedMemoOrder(null)}
          order={selectedMemoOrder}
        />
      )}

      {/* Local Order Live Tracking Modal */}
      {trackingOrder && (
        <LocalOrderTracking
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </AnimatePresence>
  );
};
