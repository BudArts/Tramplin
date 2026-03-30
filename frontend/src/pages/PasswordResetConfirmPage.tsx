// frontend/src/pages/PasswordResetConfirmPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import PasswordResetModal from '../components/PasswordResetModal';

const PasswordResetConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      setModalOpen(true);
    } else {
      navigate('/');
    }
  }, [token, navigate]);

  return (
    <div className="password-reset-confirm">
      <div className="container">
        <motion.div
          className="password-reset-confirm__content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Lock size={48} />
          <h2>Сброс пароля</h2>
          <p>Введите новый пароль для вашего аккаунта</p>
        </motion.div>
      </div>

      <PasswordResetModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          navigate('/');
        }}
        mode="confirm"
        token={token || undefined}
      />
    </div>
  );
};

export default PasswordResetConfirmPage;