import React from 'react';
import { View, Platform } from 'react-native';

export default function CenteredContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: 16,
          minHeight: '100vh',      // ensures full height
          overflowY: 'auto',       // explicitly allows scrolling if needed
          boxSizing: 'border-box', // helps with padding & sizing
        }}
      >
        {children}
      </div>
    );
  }

  return <View style={{ flex: 1 }}>{children}</View>;
}