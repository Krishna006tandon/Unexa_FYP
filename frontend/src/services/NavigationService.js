import React from 'react';

// Root navigation reference
export const navigationRef = React.createRef();

export function navigate(name, params) {
  if (navigationRef.current) {
    navigationRef.current.navigate(name, params);
  }
}

export function goBack() {
  if (navigationRef.current) {
    navigationRef.current.goBack();
  }
}
