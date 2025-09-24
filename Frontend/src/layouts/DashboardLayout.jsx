import React from 'react';
import NavBar from '../components/NavBar';

const DashboardLayout = ({ children }) => {
  return (
    <div>
      <NavBar />
      <main>{children}</main>
    </div>
  );
};

export default DashboardLayout;
