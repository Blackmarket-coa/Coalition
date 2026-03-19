import React from 'react';
import { FlatList, View } from 'react-native';

export const SimpleGrid = (props: any) => <View><FlatList {...props} data={props.data ?? []} renderItem={props.renderItem} /></View>;
export const FlatGrid = SimpleGrid;
export const SectionGrid = SimpleGrid;
