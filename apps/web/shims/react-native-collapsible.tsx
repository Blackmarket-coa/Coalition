import React from 'react';
import { View } from 'react-native';

const Collapsible = ({ children, collapsed, ...props }: any) => (collapsed ? null : <View {...props}>{children}</View>);
export default Collapsible;
