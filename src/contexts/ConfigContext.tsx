import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, ReactNode } from 'react';
import Env from 'react-native-config';
import Config from '../../navigator.config';
import { navigatorConfig, config, toBoolean, get } from '../utils';
import useStorage from '../hooks/use-storage';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
    const [instanceLinkedGatewayHost, setInstanceLinkedGatewayHost] = useStorage('INSTANCE_LINK_BLACKSTAR_GATEWAY_HOST');
    const [instanceLinkedGatewayKey, setInstanceLinkedGatewayKey] = useStorage('INSTANCE_LINK_BLACKSTAR_GATEWAY_KEY');
    const [instanceLinkedSocketHost, setInstanceLinkedSocketHost] = useStorage('INSTANCE_LINK_BLACKSTAR_SOCKET_HOST');
    const [instanceLinkedSocketPort, setInstanceLinkedSocketPort] = useStorage('INSTANCE_LINK_BLACKSTAR_SOCKET_PORT');
    const [instanceLinkedSocketSecure, setInstanceLinkedSocketSecure] = useStorage('INSTANCE_LINK_BLACKSTAR_SOCKET_SECURE');

    const setInstanceLinkConfig = useCallback(
        (key, value) => {
            switch (key) {
                case 'API_HOST':
                case 'BLACKSTAR_GATEWAY_HOST':
                case 'FLEETBASE_HOST':
                    setInstanceLinkedGatewayHost(value);
                    break;
                case 'API_KEY':
                case 'BLACKSTAR_GATEWAY_KEY':
                case 'FLEETBASE_KEY':
                    setInstanceLinkedGatewayKey(value);
                    break;
                case 'SC_HOST':
                case 'BLACKSTAR_SOCKET_HOST':
                case 'SOCKETCLUSTER_HOST':
                    setInstanceLinkedSocketHost(value);
                    break;
                case 'SC_PORT':
                case 'BLACKSTAR_SOCKET_PORT':
                case 'SOCKETCLUSTER_PORT':
                    setInstanceLinkedSocketPort(value);
                    break;
                case 'SC_SECURE':
                case 'BLACKSTAR_SOCKET_SECURE':
                case 'SOCKETCLUSTER_SECURE':
                    setInstanceLinkedSocketSecure(value);
                    break;
            }
        },
        [setInstanceLinkedGatewayHost, setInstanceLinkedGatewayKey, setInstanceLinkedSocketHost, setInstanceLinkedSocketPort, setInstanceLinkedSocketSecure]
    );

    const getInstanceLinkConfig = useCallback(() => {
        return {
            BLACKSTAR_GATEWAY_HOST: instanceLinkedGatewayHost,
            BLACKSTAR_GATEWAY_KEY: instanceLinkedGatewayKey,
            BLACKSTAR_SOCKET_HOST: instanceLinkedSocketHost,
            BLACKSTAR_SOCKET_PORT: instanceLinkedSocketPort,
            BLACKSTAR_SOCKET_SECURE: instanceLinkedSocketSecure,
        };
    }, [instanceLinkedGatewayHost, instanceLinkedGatewayKey, instanceLinkedSocketHost, instanceLinkedSocketPort, instanceLinkedSocketSecure]);

    const clearInstanceLinkConfig = useCallback(() => {
        setInstanceLinkedGatewayHost(undefined);
        setInstanceLinkedGatewayKey(undefined);
        setInstanceLinkedSocketHost(undefined);
        setInstanceLinkedSocketPort(undefined);
        setInstanceLinkedSocketSecure(undefined);
    }, [setInstanceLinkedGatewayHost, setInstanceLinkedGatewayKey, setInstanceLinkedSocketHost, setInstanceLinkedSocketPort, setInstanceLinkedSocketSecure]);

    const resolveConnectionConfig = useCallback(
        (key, defaultValue = null) => {
            const fullConfig = {
                BLACKSTAR_GATEWAY_HOST: instanceLinkedGatewayHost ?? config('BLACKSTAR_GATEWAY_HOST', config('FLEETBASE_HOST')),
                BLACKSTAR_GATEWAY_KEY: instanceLinkedGatewayKey ?? config('BLACKSTAR_GATEWAY_KEY', config('FLEETBASE_KEY')),
                BLACKSTAR_SOCKET_HOST: instanceLinkedSocketHost ?? config('BLACKSTAR_SOCKET_HOST', config('SOCKETCLUSTER_HOST', 'socket.blackmarket.coa')),
                BLACKSTAR_SOCKET_PORT: parseInt(instanceLinkedSocketPort ?? config('BLACKSTAR_SOCKET_PORT', config('SOCKETCLUSTER_PORT', '8000'))),
                BLACKSTAR_SOCKET_SECURE: toBoolean(instanceLinkedSocketSecure ?? config('BLACKSTAR_SOCKET_SECURE', config('SOCKETCLUSTER_SECURE', true))),
                BLACKSTAR_SOCKET_PATH: config('BLACKSTAR_SOCKET_PATH', config('SOCKETCLUSTER_PATH', '/socketcluster/')),
            };

            return get(fullConfig, key, defaultValue);
        },
        [instanceLinkedGatewayHost, instanceLinkedGatewayKey, instanceLinkedSocketHost, instanceLinkedSocketPort, instanceLinkedSocketSecure]
    );

    const value = useMemo(() => {
        return {
            ...Config,
            ...Env,
            navigatorConfig,
            config,
            instanceLinkConfig: getInstanceLinkConfig(),
            getInstanceLinkConfig,
            resolveConnectionConfig,
            setInstanceLinkedGatewayHost,
            setInstanceLinkedGatewayKey,
            setInstanceLinkedSocketHost,
            setInstanceLinkedSocketPort,
            setInstanceLinkedSocketSecure,
            setInstanceLinkConfig,
            clearInstanceLinkConfig,
        };
    }, [
        getInstanceLinkConfig,
        resolveConnectionConfig,
        setInstanceLinkedGatewayHost,
        setInstanceLinkedGatewayKey,
        setInstanceLinkedSocketHost,
        setInstanceLinkedSocketPort,
        setInstanceLinkedSocketSecure,
        setInstanceLinkConfig,
        clearInstanceLinkConfig,
        // Instance link config values
        instanceLinkedGatewayHost,
        instanceLinkedGatewayKey,
        instanceLinkedSocketHost,
        instanceLinkedSocketPort,
        instanceLinkedSocketSecure,
    ]);

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = (): ConfigContextValue => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};
