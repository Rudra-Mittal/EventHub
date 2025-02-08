import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const MotionLink = motion(Link);

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigation = [
    { name: 'Events', href: '/', current: true },
    { name: 'Search', href: '/search', current: false },
    { name: 'Create Event', href: '/events/create', current: false },
  ];

  const navItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };

  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 }
  };

  const mobileMenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto' }
  };

  const handleLogout = (close: { (focusableElement?: HTMLElement | React.MutableRefObject<HTMLElement | null>): void; (focusableElement?: HTMLElement | React.MutableRefObject<HTMLElement | null>): void; (): void; }) => {
    logout();
    if (close) close();
  };

  return (
    <Disclosure as="nav" className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
      {({ open, close }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <motion.div 
                  className="flex flex-shrink-0 items-center"
                  initial="hidden"
                  animate="visible"
                  variants={logoVariants}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Link to="/" className="text-white font-bold text-2xl tracking-tight" onClick={() => close()}>
                    EventHub
                  </Link>
                </motion.div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item, index) => (
                    <MotionLink
                      key={item.name}
                      to={item.href}
                      className="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                      variants={navItemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {item.name}
                    </MotionLink>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {auth.user ? (
                  <Menu as="div" className="relative ml-3">
                    <motion.div whileHover={{ scale: 1.05 }}>
                      <Menu.Button className="text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white">
                          {auth.user.name.charAt(0)}
                        </span>
                      </Menu.Button>
                    </motion.div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-150"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <motion.button
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                              whileHover={{ backgroundColor: '#f3f4f6' }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {auth.user?.name}
                            </motion.button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <motion.button
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                              whileHover={{ backgroundColor: '#f3f4f6' }}
                            >
                              {auth.user?.email}
                            </motion.button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <motion.button
                              onClick={() => handleLogout(close)}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                              whileHover={{ backgroundColor: '#f3f4f6' }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Sign out
                            </motion.button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <motion.div 
                    className="flex space-x-4"
                    initial="hidden"
                    animate="visible"
                    variants={navItemVariants}
                  >
                    <MotionLink
                      to="/login"
                      className="text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Login
                    </MotionLink>
                    <MotionLink
                      to="/register"
                      className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Register
                    </MotionLink>
                  </motion.div>
                )}
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:outline-none">
                  <span className="sr-only">Open main menu</span>
                  <motion.div
                    initial={false}
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </motion.div>
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel 
            as={motion.div}
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="sm:hidden"
          >
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item, index) => (
                <MotionLink
                  key={item.name}
                  to={item.href}
                  className="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium"
                  variants={navItemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 10 }}
                  onClick={() => close()}
                >
                  {item.name}
                </MotionLink>
              ))}
              {auth.user ? (
                <div className="border-t border-white/20 mt-2 pt-2">
                  <div className="text-white text-center text-sm font-medium">{auth.user.name}</div>
                  <div className="text-white text-center text-xs opacity-80">{auth.user.email}</div>
                  <motion.button
                    onClick={() => handleLogout(close)}
                    className="mt-2 w-full text-left text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium"
                    whileHover={{ x: 10 }}
                  >
                    Sign out
                  </motion.button>
                </div>
              ) : (
                <>
                  <MotionLink
                    to="/login"
                    className="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium"
                    variants={navItemVariants}
                    whileHover={{ x: 10 }}
                    onClick={() => close()}
                  >
                    Login
                  </MotionLink>
                  <MotionLink
                    to="/register"
                    className="text-white hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium"
                    variants={navItemVariants}
                    whileHover={{ x: 10 }}
                    onClick={() => close()}
                  >
                    Register
                  </MotionLink>
                </>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}