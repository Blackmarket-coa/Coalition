import React, { forwardRef, useImperativeHandle } from 'react';
import { FlatList, TextInput, View } from 'react-native';

const BottomSheet = forwardRef<any, React.PropsWithChildren<Record<string, unknown>>>(({ children, ...props }, ref) => {
    useImperativeHandle(ref, () => ({
        snapToIndex: () => {},
        close: () => {},
        expand: () => {},
        collapse: () => {},
        present: () => {},
        dismiss: () => {},
    }));

    return <View {...props}>{children}</View>;
});

export const BottomSheetModalProvider = ({ children }: React.PropsWithChildren) => <>{children}</>;
export const BottomSheetView = (props: React.ComponentProps<typeof View>) => <View {...props} />;
export const BottomSheetTextInput = (props: React.ComponentProps<typeof TextInput>) => <TextInput {...props} />;
export const BottomSheetFlatList = <T,>(props: React.ComponentProps<typeof FlatList<T>>) => <FlatList {...props} />;

export default BottomSheet;
