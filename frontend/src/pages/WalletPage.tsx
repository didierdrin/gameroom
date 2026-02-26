import { useState, useEffect } from 'react';
import { CreditCardIcon, ArrowLeftIcon, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import apiClient from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PRICE_PER_TICKET = 1; // USD per ticket

export const WalletPage = () => {
  const [ticketQuantity, setTicketQuantity] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'paypal' | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tickets, setTickets] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [loading, setLoading] = useState(false);

  const initialOptions = {
    clientId: "AYW86Xg7GBPBqaQtTA7L9rLkWEwwE3QEgOEkg_Wyq8Ys5ZJ7GzF16Bwv0xpXu9XGzdeIEWUb_hVgBYYo",
    currency: "USD",
    intent: "capture",
  };

  useEffect(() => {
    if (user?.id) {
      fetchWalletData();
    }
  }, [user?.id]);

  const fetchWalletData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [userRes, txRes] = await Promise.all([
        apiClient.get(`/user/${user.id}`),
        apiClient.get(`/user/${user.id}/transactions`),
      ]);
      const userData = (userRes.data as any);
      const txData = (txRes.data as any);
      if (userData.success) setTickets(userData.data.balance ?? 0);
      if (txData.success) setTransactions(txData.data.transactions ?? []);
    } catch (error) {
      console.error("Failed to fetch wallet data", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSuccess = async (details: any, amountUsd: string) => {
    try {
      await apiClient.post(`/user/${user?.id}/deposit`, {
        amount: parseFloat(amountUsd),
        transactionDetails: details,
      });
      const qty = Math.round(parseFloat(amountUsd) / PRICE_PER_TICKET);
      alert(`Successfully purchased ${qty} ticket${qty !== 1 ? 's' : ''}!`);
      fetchWalletData();
      setTicketQuantity('');
    } catch (error) {
      console.error("Purchase failed", error);
      alert("Failed to process purchase.");
    }
  };

  const paymentMethods = [
    { id: 'paypal', name: 'PayPal / Card', icon: CreditCardIcon, color: 'bg-blue-600' },
  ];

  const ticketPacks = [
    { tickets: 10, label: '10' },
    { tickets: 25, label: '25' },
    { tickets: 50, label: '50' },
    { tickets: 100, label: '100' },
  ];

  const quantity = ticketQuantity === '' ? 0 : Math.max(0, Math.floor(Number(ticketQuantity)));
  const totalCost = (quantity * PRICE_PER_TICKET).toFixed(2);
  const canCheckout = selectedMethod === 'paypal' && quantity > 0;

  return (
    <PayPalScriptProvider options={initialOptions}>
      <div className={`min-h-screen p-4 md:p-8 ${isLight ? 'bg-gray-100' : 'bg-gray-900'}`}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Left Column: Buy Tickets */}
          <div>
            <button
              onClick={() => navigate(-1)}
              className={`flex items-center mb-6 transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
            >
              <ArrowLeftIcon size={20} className="mr-2" />
              Back
            </button>

            <div className={`rounded-2xl p-6 md:p-8 shadow-xl mb-8 ${isLight ? 'bg-white border border-[#b4b4b4]' : 'bg-gray-800'}`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Buy Tickets</h1>
                  <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Purchase tickets to join game rooms</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <img src="/assets/ticket-icon.png" alt="" className="w-8 h-8 object-contain" />
                  <div>
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Your Tickets</p>
                    <p className={`text-2xl font-bold ${isLight ? 'text-[#8b5cf6]' : 'text-purple-400'}`}>{tickets.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className={`block mb-3 font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Number of tickets</label>
                <input
                  type="number"
                  value={ticketQuantity}
                  onChange={(e) => setTicketQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  step="1"
                  className={`w-full px-4 py-4 border-2 rounded-xl text-2xl focus:outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-[#b4b4b4] text-gray-900 focus:border-[#8b5cf6]'
                      : 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                  }`}
                />
                <div className="flex gap-2 mt-3">
                  {ticketPacks.map(({ tickets: t, label }) => (
                    <button
                      key={t}
                      onClick={() => setTicketQuantity(String(t))}
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        isLight
                          ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {quantity > 0 && (
                <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
                  isLight ? 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/30' : 'bg-gray-700/50'
                }`}>
                  <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>
                    <strong className={isLight ? 'text-gray-900' : 'text-white'}>{quantity.toLocaleString()}</strong> ticket{quantity !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xl font-bold text-green-600">${totalCost}</span>
                </div>
              )}

              <div className="mb-8">
                <label className={`block mb-3 font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Payment Method</label>
                <div className="space-y-3">
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center ${
                          selectedMethod === method.id
                            ? isLight
                              ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
                              : 'border-purple-500 bg-purple-500/10'
                            : isLight
                              ? 'border-[#b4b4b4] bg-white hover:border-[#8b5cf6]/50'
                              : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className={`${method.color} p-3 rounded-lg mr-4`}>
                          <Icon size={24} className="text-white" />
                        </div>
                        <span className={isLight ? 'text-gray-900 font-medium' : 'text-white font-medium'}>{method.name}</span>
                        {selectedMethod === method.id && (
                          <div className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center ${
                            isLight ? 'bg-[#8b5cf6]' : 'bg-purple-500'
                          }`}>
                            <span className="text-white text-sm">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {canCheckout ? (
                <PayPalButtons
                  style={{ layout: "vertical" }}
                  createOrder={(_data, actions) => {
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [
                        {
                          amount: {
                            currency_code: "USD",
                            value: totalCost,
                          },
                        },
                      ],
                    });
                  }}
                  onApprove={async (_data, actions) => {
                    if (actions.order) {
                      const details = await actions.order.capture();
                      handlePurchaseSuccess(details, totalCost);
                    }
                  }}
                />
              ) : (
                <button
                  disabled
                  className={`w-full py-4 font-bold rounded-xl cursor-not-allowed ${
                    isLight ? 'bg-gray-200 text-gray-500' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  Enter ticket amount & select payment method
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Transaction History */}
          <div>
            <div className={`rounded-2xl p-6 md:p-8 shadow-xl h-full ${
              isLight ? 'bg-white border border-[#b4b4b4]' : 'bg-gray-800'
            }`}>
              <h2 className={`text-2xl font-bold mb-6 flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
                <History className="mr-2" /> Transaction History
              </h2>

              {loading ? (
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Loading...</p>
              ) : transactions.length === 0 ? (
                <p className={`text-center py-10 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>No transactions yet.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {transactions.map((tx, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg flex justify-between items-center ${
                        isLight ? 'bg-gray-100 border border-gray-200' : 'bg-gray-700/50'
                      }`}
                    >
                      <div>
                        <p className={`font-medium capitalize ${isLight ? 'text-gray-900' : 'text-white'}`}>
                          {tx.description || tx.type?.replace('_', ' ') || 'Transaction'}
                        </p>
                        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {tx.date ? `${new Date(tx.date).toLocaleDateString()} ${new Date(tx.date).toLocaleTimeString()}` : ''}
                        </p>
                      </div>
                      <div className={`font-bold ${tx.type === 'deposit' || tx.type === 'win_prize' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'deposit' || tx.type === 'win_prize' ? '+' : '-'}
                        {tx.type === 'deposit' ? `${Number(tx.amount || 0).toFixed(0)} tickets` : `$${Number(tx.amount || 0).toFixed(2)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </PayPalScriptProvider>
  );
};
