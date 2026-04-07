import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Upload, CheckCircle2, AlertCircle, Loader2, ChevronRight, Copy, Smartphone } from 'lucide-react';
import { db, storage, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function UpiPayment() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Generate unique Order ID
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setOrderId(`ORD-${timestamp}-${random}`);
    
    if (profile?.displayName) {
      setUserName(profile.displayName);
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateUpiLink = () => {
    const merchantVpa = "7029865930@nyes"; // Example VPA
    const merchantName = "FreshCart Store";
    const note = `Payment for Order ${orderId}`;
    return `upi://pay?pa=${merchantVpa}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  const handlePayNow = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    window.location.href = generateUpiLink();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !userName || !screenshot) {
      showToast('Please fill all fields and upload a screenshot', 'error');
      return;
    }

    setLoading(true);
    try {
      // Upload screenshot to Firebase Storage
      const storageRef = ref(storage, `upi_screenshots/${orderId}-${screenshot.name}`);
      const uploadResult = await uploadBytes(storageRef, screenshot);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // Save order data to Firestore
      await addDoc(collection(db, 'upi_orders'), {
        orderId,
        userName,
        amount: Number(amount),
        screenshotUrl: downloadUrl,
        status: 'pending',
        createdAt: Timestamp.now(),
        userId: user?.uid || 'anonymous'
      });

      setSubmitted(true);
      showToast('Payment proof submitted successfully!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'upi_orders');
      showToast('Failed to submit payment proof. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-xl text-center border border-green-100">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Submitted!</h2>
        <p className="text-gray-500 mb-6">Your payment proof for <span className="font-mono font-bold text-green-600">{orderId}</span> has been sent for approval. We will notify you once it is confirmed.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-green-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-8 h-8" />
            <h1 className="text-2xl font-bold">UPI Payment System</h1>
          </div>
          <p className="text-green-100">Fast, secure, and easy payments</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Step 1: Order Details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-bold mb-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-sm">1</span>
              <h2>Order Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Order ID</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="font-mono text-gray-600 flex-grow">{orderId}</span>
                  <button type="button" onClick={() => copyToClipboard(orderId)} className="text-gray-400 hover:text-green-600 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Your Name</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Payment Amount (₹)</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-4 text-2xl font-bold bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                required
              />
            </div>
          </section>

          {/* Step 2: Payment */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-bold mb-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-sm">2</span>
              <h2>Make Payment</h2>
            </div>
            
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                  {/* In a real app, you'd generate a QR code here */}
                  <Smartphone className="w-12 h-12" />
                </div>
              </div>
              <div className="flex-grow space-y-3 text-center md:text-left">
                <h3 className="font-bold text-blue-900">Pay using any UPI App</h3>
                <p className="text-sm text-blue-700">Click the button below to open your preferred UPI app (GPay, PhonePe, Paytm, etc.)</p>
                <button 
                  type="button"
                  onClick={handlePayNow}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 w-full md:w-auto"
                >
                  Pay Now
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Step 3: Proof */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-bold mb-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-sm">3</span>
              <h2>Upload Proof</h2>
            </div>
            
            <div className="relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="screenshot-upload"
                required
              />
              <label 
                htmlFor="screenshot-upload"
                className={`w-full border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                  screenshotPreview ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                }`}
              >
                {screenshotPreview ? (
                  <div className="relative w-full max-w-[200px] aspect-[9/16] rounded-xl overflow-hidden shadow-lg">
                    <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-bold">Change Image</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-700">Upload Payment Screenshot</p>
                      <p className="text-xs text-gray-500 mt-1">Take a screenshot of the successful payment screen</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </section>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                I Have Paid
                <CheckCircle2 className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">Important Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure the Order ID is visible in the payment note if possible.</li>
            <li>The screenshot must show the transaction ID and amount clearly.</li>
            <li>Payments are usually verified within 15-30 minutes.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
