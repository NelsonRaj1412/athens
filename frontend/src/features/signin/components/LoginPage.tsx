// src/features/signin/pages/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Form, Input, Button, Checkbox, App } from 'antd';
import { useNavigate } from 'react-router-dom';
// Using react-icons for better brand logos. You may need to run: npm install react-icons
import { FaApple, FaGoogle, FaXTwitter } from 'react-icons/fa6';

import api from '../../../common/utils/axiosetup';
import useAuthStore from '../../../common/store/authStore';

// Your original asset imports, 100% preserved
import ones from '../../../assets/ones.jpg';
import twos from '../../../assets/twos.jpg';
import threes from '../../../assets/threes.jpeg';
import fours from '../../../assets/fours.jpg';
import oneWebp from '../../../assets/one.webp';

// Your original slides array with your project's content, 100% preserved
const slides = [
  {
    image: ones,
    title: "Comprehensive EHS Management",
    description: "Streamline your Environmental, Health, and Safety processes with our integrated platform for modern workplaces."
  },
  {
    image: twos,
    title: "Environmental Monitoring",
    description: "Advanced environmental monitoring and compliance tracking to ensure regulatory adherence and sustainability goals."
  },
  {
    image: threes,
    title: "Safety Training Excellence",
    description: "Comprehensive safety training programs and certification management to keep your workforce protected and compliant."
  },
  {
    image: fours,
    title: "Quality Assurance",
    description: "Robust quality management systems ensuring consistent standards and continuous improvement across all operations."
  },
  {
    image: oneWebp,
    title: "Sustainable Operations",
    description: "Sustainable manufacturing and operational practices that drive environmental responsibility and business success."
  }
];

// Your original ImageCarousel component, 100% preserved
const ImageCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const imageVariants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.img
          key={currentSlide}
          src={slides[currentSlide].image}
          alt={slides[currentSlide].title}
          className="absolute inset-0 w-full h-full object-cover"
          variants={imageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </AnimatePresence>
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 md:p-12 text-white bg-gradient-to-t from-black/70 to-transparent">
        <div className="max-w-md">
          <motion.h3
            key={`title-${currentSlide}`}
            className="text-3xl font-bold mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {slides[currentSlide].title}
          </motion.h3>
          <motion.p
            key={`desc-${currentSlide}`}
            className="text-white/80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1, duration: 0.5, ease: 'easeInOut' }}
          >
            {slides[currentSlide].description}
          </motion.p>
        </div>
        <div className="flex space-x-2 mt-6">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50 w-4 hover:bg-white/75'}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const clearToken = useAuthStore((state) => state.clearToken);
  const [isLoading, setIsLoading] = useState(false);
  const { message } = App.useApp();

  // Clear any expired tokens on login page load
  useEffect(() => {
    clearToken();
  }, [clearToken]);



  const onFinish = async (values: any) => {
    setIsLoading(true);
    try {
      // Simple direct login without security complexity
      const response = await api.post('/authentication/login/', {
        username: values.username,
        password: values.password
      });

      const { access, refresh, username, usertype, django_user_type, userId, user_id, isPasswordResetRequired, grade, project_id } = response.data;
      const token = access || response.data.token;

      if (!token || !refresh) {
        message.error('Token is missing from the server response.');
        return;
      }

      setToken(
        token,
        refresh,
        project_id ?? null,
        username,
        usertype,
        django_user_type,
        userId || user_id,
        isPasswordResetRequired,
        grade,
        response.data.is_approved,
        response.data.has_submitted_details
      );
      message.success('Login successful!');

      if (isPasswordResetRequired) {
        navigate('/reset-password');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      const description = error.response?.data?.detail || 'Invalid username or password.';
      message.error(description);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0d2a30] flex items-center justify-center px-2 sm:px-4 md:px-6 font-sans">
      <main className="flex w-full bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ minHeight: '800px' }}>
        
        {/* Left Side: Login Form with the new UI */}
        <motion.div
          className="flex w-full flex-col justify-center p-8 sm:p-12 md:w-3/8"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="w-full max-w-sm mx-auto">
            {/* Header section matching the design */}
            <div className="mb-10 text-left">
              <h2 className="text-2xl font-bold text-gray-800 tracking-wider">EHS Pro</h2>
              <p className="text-sm text-gray-500">Explore More. Experience Safety.</p>
            </div>

            {/* Main form section */}
            <div className="mb-8 text-left">
              <h1 className="text-3xl font-bold text-gray-900">Journey Begins</h1>
              <p className="mt-2 text-gray-500">Log in with Open account</p>
            </div>

            <div className="flex items-center justify-center space-x-4 mb-6">
              <Button 
                size="large" 
                icon={<FaApple className="text-xl" />} 
                className="!w-16 !h-12 !flex !items-center !justify-center" 
                onClick={(e) => {
                  e.preventDefault();
                  // Apple login placeholder
                  message.info('Apple login coming soon!');
                }}
              />
              <Button 
                size="large" 
                icon={<FaGoogle className="text-xl" />} 
                className="!w-16 !h-12 !flex !items-center !justify-center" 
                onClick={(e) => {
                  e.preventDefault();
                  // Google login placeholder
                  message.info('Google login coming soon!');
                }}
              />
              <Button 
                size="large" 
                icon={<FaXTwitter className="text-xl" />} 
                className="!w-16 !h-12 !flex !items-center !justify-center" 
                onClick={(e) => {
                  e.preventDefault();
                  // Twitter login placeholder
                  message.info('Twitter login coming soon!');
                }}
              />
            </div>

            <div className="my-6 flex items-center">
              <hr className="w-full" /><span className="mx-4 text-xs uppercase text-gray-400">Or</span><hr className="w-full" />
            </div>

            <Form layout="vertical" onFinish={onFinish} requiredMark={false} autoComplete="off">
              <Form.Item
                label={<span className="font-semibold">Username</span>}
                name="username"
                rules={[
                  { required: true, message: 'Please enter your username' },
                  { max: 150, message: 'Username too long' },
                  { pattern: /^[a-zA-Z0-9._@-]+$/, message: 'Username contains invalid characters' }
                ]}
              >
                <Input
                  placeholder="Enter your username"
                  size="large"
                  className="!rounded-lg"
                  autoComplete="username"
                  maxLength={150}
                  onPaste={(e) => {
                    // Prevent pasting potentially malicious content
                    const paste = e.clipboardData.getData('text');
                    if (paste.length > 150) {
                      e.preventDefault();
                      message.warning('Username too long');
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                label={<span className="font-semibold">Password</span>}
                name="password"
                rules={[
                  { required: true, message: 'Please enter your password' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                  { max: 128, message: 'Password too long' }
                ]}
              >
                <Input.Password
                  placeholder="Enter password"
                  size="large"
                  className="!rounded-lg"
                  autoComplete="current-password"
                  maxLength={128}
                  onCopy={(e) => e.preventDefault()} // Prevent copying password
                  onPaste={(e) => {
                    // Allow pasting but limit length
                    const paste = e.clipboardData.getData('text');
                    if (paste.length > 128) {
                      e.preventDefault();
                      message.warning('Password too long');
                    }
                  }}
                />
              </Form.Item>
              <div className="mb-6 flex items-center justify-between text-sm">
                <Form.Item name="remember" valuePropName="checked" noStyle><Checkbox>Remember me</Checkbox></Form.Item>
                <a href="#" className="font-semibold text-gray-700 hover:text-black">Forgot Password?</a>
              </div>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={isLoading} className="w-full !h-12 !text-base !font-semibold !bg-black hover:!bg-gray-800 !rounded-lg">
                  Log In
                </Button>
              </Form.Item>

              {/* Your original bottom links, preserved */}
              <div className="mt-4 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
                  Create one for free
                </a>
              </div>
              <div className="mt-6 text-center">
                <Button type="default" onClick={() => window.location.href = '/create-master-admin'}>
                  Create Master Admin
                </Button>
              </div>
            </Form>
          </div>
        </motion.div>

        {/* Right Side: Your Image Carousel INSIDE the new custom-shaped container */}
        <div className="hidden w-5/8 md:flex items-center justify-center p-4">
        <div
          className="w-full h-full rounded-2xl overflow-hidden"
        >
          <ImageCarousel />
        </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;