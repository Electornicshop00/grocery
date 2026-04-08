import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, LogIn, UserPlus, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.emailVerified && !loading) {
        setEmail(user.email || '');
        setShowVerification(true);
        signOut(auth);
      }
    });
    return () => unsubscribe();
  }, [loading]);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      showToast(t('loginToCart'), 'info');
      setShowVerification(false);
      setIsLogin(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setResending(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        try {
          const { user } = await signInWithEmailAndPassword(auth, email, password);
          if (!user.emailVerified) {
            await sendEmailVerification(user);
            await signOut(auth);
            setShowVerification(true);
            showToast(t('verifyEmail'), 'info');
            return;
          }
          showToast(t('login'), 'success');
          navigate('/');
        } catch (err: any) {
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            const msg = "Email or password is incorrect";
            setError(msg);
            showToast(msg, 'error');
          } else {
            setError(err.message);
            showToast(err.message, 'error');
          }
        }
      } else {
        try {
          const { user } = await createUserWithEmailAndPassword(auth, email, password);
          if (displayName) {
            await updateProfile(user, { displayName });
          }
          await sendEmailVerification(user);
          await signOut(auth);
          setShowVerification(true);
          showToast(t('verifyEmail'), 'success');
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            const msg = "User already exists. Please sign in";
            setError(msg);
            showToast(msg, 'error');
          } else {
            setError(err.message);
            showToast(err.message, 'error');
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="max-w-md mx-auto mt-12 px-4">
        <div className="p-6 md:p-8 rounded-3xl shadow-xl border border-gray-200 text-center bg-white transition-colors duration-300">
          <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{t('verifyEmail')}</h1>
          <p className="text-gray-600 mb-8">
            We have sent you a verification email to <span className="font-bold text-gray-800">{email}</span>. 
            Please verify it and log in.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => {
                setShowVerification(false);
                setIsLogin(true);
              }}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors"
            >
              {t('login')}
            </button>
            <button 
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {resending ? 'Processing...' : t('verifyEmail')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 md:mt-12 px-4">
      <div className="p-6 md:p-8 rounded-3xl shadow-xl border border-gray-200 bg-white transition-colors duration-300">
        <div className="text-center mb-8">
          <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isLogin ? <LogIn className="w-8 h-8 text-gray-900" /> : <UserPlus className="w-8 h-8 text-gray-900" />}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{isLogin ? t('login') : t('signup')}</h1>
          <p className="text-gray-500 mt-2">{isLogin ? 'Login to your FreshCart account' : 'Join FreshCart for fresh groceries'}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                required
                type="text" 
                placeholder={t('fullName')}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              required
              type="email" 
              placeholder="Email Address"
              className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              required
              type={showPassword ? 'text' : 'password'} 
              placeholder="Password"
              className="w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? t('login') : t('signup')}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-gray-900 font-bold hover:underline"
          >
            {isLogin ? t('signup') : t('login')}
          </button>
        </p>
      </div>
    </div>
  );
}
