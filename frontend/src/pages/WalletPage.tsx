import { useState, useEffect } from 'react';
import { CreditCardIcon, SmartphoneIcon, ArrowLeftIcon, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import apiClient from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';

export const WalletPage = () => {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'mtn' | 'airtel' | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const initialOptions = {
    clientId: "AYW86Xg7GBPBqaQtTA7L9rLkWEwwE3QEgOEkg_Wyq8Ys5ZJ7GzF16Bwv0xpXu9XGzdeIEWUb_hVgBYYo",
    currency: "USD",
    intent: "capture",
  };

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/user/${user?.id}/transactions`);
      const data = (res.data as any);
      if (data.success) {
        setTransactions(data.data.transactions);
        setBalance(data.data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch wallet data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositSuccess = async (details: any, amount: string) => {
    try {
      await apiClient.post(`/user/${user?.id}/deposit`, {
        amount: parseFloat(amount),
        transactionDetails: details
      });
      alert(`Successfully added $${amount} to your wallet!`);
      fetchTransactions();
      setAmount('');
    } catch (error) {
      console.error("Deposit failed", error);
      alert("Failed to process deposit on server side.");
    }
  };

  const paymentMethods = [
    { id: 'paypal', name: 'PayPal / Card', icon: CreditCardIcon, color: 'bg-blue-600' },
    // { id: 'mtn', name: 'MTN Mobile Money', icon: SmartphoneIcon, color: 'bg-yellow-500' }, // Temporarily disabled or placeholder
    // { id: 'airtel', name: 'Airtel Money', icon: SmartphoneIcon, color: 'bg-red-600' }
  ];

  return (
    <PayPalScriptProvider options={initialOptions}>
      <div className="min-h-screen bg-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Add Funds */}
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeftIcon size={20} className="mr-2" />
              Back
            </button>

            <div className="bg-gray-800 rounded-2xl p-6 md:p-8 shadow-xl mb-8">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Add Funds</h1>
                    <p className="text-gray-400">Top up your wallet balance</p>
                 </div>
                 <div className="text-right">
                    <p className="text-sm text-gray-400">Current Balance</p>
                    <p className="text-2xl font-bold text-green-400">${balance.toFixed(2)}</p>
                 </div>
              </div>

              <div className="mb-8">
                <label className="block text-gray-300 mb-3 font-medium">Enter Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-2xl focus:outline-none focus:border-purple-500 transition-colors"
                    min="1"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  {[10, 25, 50, 100].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-gray-300 mb-3 font-medium">Payment Method</label>
                <div className="space-y-3">
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id as any)}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center ${
                          selectedMethod === method.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className={`${method.color} p-3 rounded-lg mr-4`}>
                          <Icon size={24} className="text-white" />
                        </div>
                        <span className="text-white font-medium">{method.name}</span>
                        {selectedMethod === method.id && (
                          <div className="ml-auto w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedMethod === 'paypal' && amount && parseFloat(amount) > 0 ? (
                 <PayPalButtons
                    style={{ layout: "vertical" }}
                    createOrder={(data, actions) => {
                        return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                                {
                                    amount: {
                                        currency_code: "USD",
                                        value: amount,
                                    },
                                },
                            ],
                        });
                    }}
                    onApprove={async (data, actions) => {
                        if (actions.order) {
                            const details = await actions.order.capture();
                            handleDepositSuccess(details, amount);
                        }
                    }}
                />
              ) : (
                <button
                    disabled
                    className="w-full py-4 bg-gray-700 text-gray-400 font-bold rounded-xl cursor-not-allowed"
                >
                    Enter Amount & Select Method
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Transaction History */}
          <div>
            <div className="bg-gray-800 rounded-2xl p-6 md:p-8 shadow-xl h-full">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <History className="mr-2" /> Transaction History
                </h2>
                
                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : transactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-10">No transactions yet.</p>
                ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {transactions.map((tx, idx) => (
                            <div key={idx} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-white font-medium capitalize">{tx.description || tx.type.replace('_', ' ')}</p>
                                    <p className="text-sm text-gray-400">{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}</p>
                                </div>
                                <div className={`font-bold ${tx.type === 'deposit' || tx.type === 'win_prize' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'deposit' || tx.type === 'win_prize' ? '+' : '-'}${tx.amount.toFixed(2)}
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
