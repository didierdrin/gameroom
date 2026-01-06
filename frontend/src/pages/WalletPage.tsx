import { useState } from 'react';
import { CreditCardIcon, SmartphoneIcon, ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WalletPage = () => {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mtn' | 'airtel' | null>(null);
  const navigate = useNavigate();

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCardIcon, color: 'bg-blue-600' },
    { id: 'mtn', name: 'MTN Mobile Money', icon: SmartphoneIcon, color: 'bg-yellow-500' },
    { id: 'airtel', name: 'Airtel Money', icon: SmartphoneIcon, color: 'bg-red-600' }
  ];

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }
    alert(`Processing ${amount} via ${selectedMethod.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon size={20} className="mr-2" />
          Back
        </button>

        <div className="bg-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-white mb-2">Add Funds</h1>
          <p className="text-gray-400 mb-8">Top up your wallet balance</p>

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
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[10, 25, 50, 100].map(val => (
                <button
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
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

          <button
            onClick={handleDeposit}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!amount || !selectedMethod}
          >
            Deposit ${amount || '0.00'}
          </button>
        </div>
      </div>
    </div>
  );
};
